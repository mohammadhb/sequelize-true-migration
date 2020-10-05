const Sequelize = require('sequelize');

//Errors
const {
    VerificationError,
    TypeDefinitionMismatchError,
    CharMaxLengthMismatchError
} = require('./errors');

class Main {

    constructor(_targetDatabaseName,_sequelizeTargetObject,_sequelizeInformationObject,_modelList,_options){

        this.modelList                  = _modelList;
        this.sequelizeInformationObject = _sequelizeInformationObject;
        this.targetDatabaseName         = _targetDatabaseName;
        this.sequelizeTargetObject      = _sequelizeTargetObject;
        this.sequelizeQueryInterface    = _sequelizeTargetObject.getQueryInterface();
        this.options                    = _options;

        console.log(this.options)

    }

    //Setters and Getters
    get modelList(){

        return this._modelList;

    }

    set modelList(modelList){

        this._modelList = modelList;

    }

    get targetDatabaseName(){

        return this._targetDatabaseName;

    }

    set targetDatabaseName(value){

        this._targetDatabaseName = value;

    }

    get sequelizeTargetObject(){

        return this._sequelizeTargetObject;

    }

    set sequelizeTargetObject(sequelizeTargetObject){

        this._sequelizeTargetObject = sequelizeTargetObject;

    }

    get sequelizeInformationObject(){

        return this._sequelizeInformationObject;
        
    }

    set sequelizeInformationObject(sequelizeInformationObject){

        this._sequelizeInformationObject = sequelizeInformationObject;
        
    }

    get sequelizeQueryInterface(){

        return this._sequelizeQueryInterface;
        
    }

    set sequelizeQueryInterface(value){ 

        this._sequelizeQueryInterface = value;
        
    }

    //Methods
    async getSequelizeQueryInterface(){

        return this.sequelizeTargetObject.getQueryInterface();

    }

    async getDatabaseInformationSchemaObject(){

        const sequelizeInformationObject = this.sequelizeInformationObject;
        const targetDatabaseName         = this.targetDatabaseName;

        return new Promise ( async (resolve,reject)=>{

            const queryResults = await sequelizeInformationObject.query("SELECT * FROM `COLUMNS`")
            const schemas = queryResults[0].filter(queryResult=>queryResult.TABLE_SCHEMA==this.targetDatabaseName);

            let convertedSchemas = [];

            schemas.forEach(schema=>{

                let matchSchemaIndex = convertedSchemas.findIndex(convertedSchema=>schema.TABLE_NAME==convertedSchema.table);

                // console.log("schema",schema)

                if(matchSchemaIndex==-1){
                    convertedSchemas.push({
                        table:schema.TABLE_NAME,
                        columns:[]
                    });
                    matchSchemaIndex = convertedSchemas.length-1;
                }

                // console.log("convertedSchemas[matchSchemaIndex]",convertedSchemas[matchSchemaIndex])

                convertedSchemas[matchSchemaIndex].columns.push({
                    name:schema.COLUMN_NAME,
                    dataType:schema.DATA_TYPE,
                    columnDefault:schema.COLUMN_DEFAULT,
                    isNullable:schema.IS_NULLABLE,
                    charMaxLength:schema.CHARACTER_MAXIMUM_LENGTH
                });

            });

            return resolve(convertedSchemas);


        });

    }

    iterateSequelizeModels (databaseInformationSchemaObjects,sequelizeModels,onMatch,onMismatch){

        Object.keys(sequelizeModels).forEach((sequelizeModel)=>{

            let match = null;

            if(sequelizeModel!="sequelize"&&sequelizeModel!="Sequelize") {

                match = databaseInformationSchemaObjects.findIndex(databaseInformationSchemaObject=>databaseInformationSchemaObject.table==sequelizeModels[sequelizeModel].options.tableName);

                if(match != -1)
                    onMatch(match,databaseInformationSchemaObjects[match],sequelizeModels[sequelizeModel]);
                else
                    onMismatch(match,null,sequelizeModels[sequelizeModel]);

            }
            // else{
            //     match = null;
            // }
            

        });


    }

    async checkForUnAddedColumn(tableName,schemaMatch,modelMatch) {

        let result = false;

        if(!schemaMatch && modelMatch.field){ //undefined means that there is not a match on table from model

            //Creating column
            console.log("Adding Column",modelMatch)
            
            try{

                if(!(modelMatch.type instanceof Sequelize.DataTypes.VIRTUAL)){

                    await this.sequelizeQueryInterface.addColumn(tableName,modelMatch.field,modelMatch);
                    result = true;
                    
                }

                result = true;
                

            }catch(e){

                if(e.message.includes("errno: 150")){

                    console.error("Error : Please consider using BIGINT.UNSIGNED in your foreign key ( refrence ) data type rather than BIGINT.SIGNED or BIGINT.");
                    result = false;

                }

                result = false

            }


        }

        return new Promise((resolve,reject)=>{

            return resolve(result);

        });


    }

    verifyTableColumnWithModelScheme(tableColumn,modelScheme){

        const typeConversion = {
    
            tinyint:Sequelize.DataTypes.TINYINT,
            int:Sequelize.DataTypes.INTEGER,
            bigint:Sequelize.DataTypes.BIGINT,
            double:Sequelize.DataTypes.DOUBLE,
    
            text:Sequelize.DataTypes.TEXT,
            longtext:Sequelize.DataTypes.JSON,
            varchar:Sequelize.DataTypes.STRING,
            enum:Sequelize.DataTypes.ENUM,
            
            timestamp:Sequelize.DataTypes.DATE,
            time:Sequelize.DataTypes.TIME,
            date:Sequelize.DataTypes.DATEONLY,
            datetime:Sequelize.DataTypes.DATE
    
        };
    
        // console.log("typeConversion[tableColumn.dataType],modelScheme.type",tableColumn,modelScheme)

        

        
        if(modelScheme.type instanceof Sequelize.DataTypes.VIRTUAL) return {
            err:null,
            verify:true
        }
    
        if(modelScheme.type instanceof typeConversion[tableColumn.dataType] ){

            // console.log(tableColumn.name);
    
            if(modelScheme.type.options && modelScheme.type.options.length && tableColumn.charMaxLength){
                
                if ( modelScheme.type.options.length == tableColumn.charMaxLength) 
                    return {
                        verify:true,
                        err:null
                    };
                else
                    return {
                        verify:false,
                        err:new CharMaxLengthMismatchError()
                    };
    
            } 
            
            return {
                verify:true,
                err:null
            };
    
        } else if ( typeof modelScheme.type == 'string' && tableColumn.dataType == 'double' && modelScheme.type.includes("DOUBLE(") ) {
    
            return {
                verify:true,
                err:null
            };
    
        } else if ( typeof modelScheme.type == 'string' && tableColumn.dataType == 'double' && modelScheme.type.includes("DOUBLE("))
    
        console.log("conversion NOT OK");
    
        return {
            verify:false,
            err:new TypeDefinitionMismatchError()
        };
    
    }

    async checkForModifiedColumn(tableName,schemaMatch,modelMatch) {

        if(modelMatch.field){ //undefined means that there is a match but should be checked on table from model

            //Editing column and Matching with Models

            const verification = this.verifyTableColumnWithModelScheme(schemaMatch,modelMatch);

            if(!verification.verify) {

                // console.log("match",tableName,schemaMatch,modelMatch);
                
                if(verification.err instanceof CharMaxLengthMismatchError) {

                    // console.log("CharMaxLengthMismatchError",tableName,schemaMatch.name,modelMatch);
                    // this.sequelizeQueryInterface.changeColumn(tableName,schemaMatch.name,modelMatch);

                } else if (verification.err instanceof TypeDefinitionMismatchError) {

                    
                    if(modelMatch.references){

                        console.log("modelMatch.references.model , id",modelMatch.references.model,modelMatch.references.key);
                        const refrenceKey = Object.keys(database).find(modelKey=>modelMatch.references.model==database[modelKey].options.tableName);
                        let refrenceValue;

                        if(refrenceKey){

                            refrenceValue = database[refrenceKey];
                            const autoGeneratedColumn = refrenceValue.fieldRawAttributesMap[modelMatch.references.key]._autoGenerated;

                            if(autoGeneratedColumn) {

                                console.error(`Error : Please Check your following Model : "${refrenceKey}" ( Column "${modelMatch.references.key}" ) to match the corresponding Model on Database Table : "${tableName}" ( Column "${modelMatch.field}" ) column that used as "Foreign Key"`);

                            }else{
                                //alter column and fix it

                            }

                            console.log("refrenceValue",refrenceValue.fieldRawAttributesMap[modelMatch.references.key]._autoGenerated);

                        }else {

                            // console.error(`Error : Please Check your following Refrence  : "${refrenceKey}" ( Column "${modelMatch.references.key}" ) to match the corresponding Model on Database Table : "${tableName}" ( Column "${modelMatch.field}" ) column that used as "Foreign Key"`);

                        }

                    }else {

                        // console.log("!modelMatch.references",tableName,schemaMatch.name,modelMatch);
                        // console.log("modelMatch trunc",seq_scheme_key,modelMatch)

                        const seqSchemeTemp = modelMatch;

                        this.sequelizeQueryInterface
                        .changeColumn(tableName,schemaMatch.name,modelMatch)
                        .then((result)=>{

                        })
                        .catch((error)=>{

                            // console.log("modelMatch trunc",seqSchemeTemp)

                            if( this.options.forceTruncate && (error.message.includes("Truncated incorrect") || error.message.includes("Data truncated for column")) ){

                                console.log("removeCol",tableName,schemaMatch.name)

                                this.sequelizeQueryInterface
                                .removeColumn(tableName,schemaMatch.name)
                                .then((result)=>{

                                    console.log("addCol",tableName,schemaMatch.name,seqSchemeTemp)

                                    this.sequelizeQueryInterface
                                    .addColumn(tableName,schemaMatch.name,seqSchemeTemp)
                                    

                                })
                                .catch((error)=>{

                                    // console.log(error)
                                })
                                
                            } else if (error.message.includes("Multiple primary key defined") && seqSchemeTemp.primaryKey) {
                                // console.log(seqSchemeTemp,tableName)
                                console.error(`Error : Please Check your following Database Table : "${tableName}" ( Column "${seqSchemeTemp.field}" ) to resolve conflict of the Model's Primary Keys mapped to Database.`);
                            }

                            // console.log("Trunc :",error);

                        })
                        

                    }
                    

                }

            }

        }

    }

    async iterateSequelizeModelColumn (tableName,schema,modelScheme,onMatch,onMismatch){

        // console.log(Object.keys(modelScheme))

        for ( const modelSchemeKey of Object.keys(modelScheme) ) {

            // console.log("modelSchemeKey",modelSchemeKey)

            const schemaMatch = schema.columns.find(schemeColumn=>schemeColumn.name==modelScheme[modelSchemeKey].field);

            onMatch(schemaMatch)

            await this.checkForUnAddedColumn(tableName,schemaMatch,modelScheme[modelSchemeKey]);
            await this.checkForModifiedColumn(tableName,schemaMatch,modelScheme[modelSchemeKey]);
            // await this.checkForDeletedColumn();

        }


    }

    async synchronize (){

        //options
        const forceTruncate = this.options.forceTruncate;

        //Objects
        const databaseInformationSchemaObjects = await this.getDatabaseInformationSchemaObject();
        const sequelizeQueryInterface = this.sequelizeQueryInterface;
        const sequelizeModels = this.modelList;

        this.iterateSequelizeModels (databaseInformationSchemaObjects,sequelizeModels,async (schemaIndex,schema,model)=>{
            //Found a Match

            const tableName     = model.options.tableName;
            const modelScheme   = model.fieldRawAttributesMap;

            await this.iterateSequelizeModelColumn(tableName,schema,modelScheme,(match)=>{

                // console.log(match)

            },(match)=>{



            });

        },(schemaIndex,schema,model)=>{

            //Found a Mismatch

            const newTableName = model.options.tableName;
            const newTableScheme = model.fieldRawAttributesMap;
            
            try {

                console.log("Adding Table",newTableScheme)

                sequelizeQueryInterface
                .createTable(newTableName,newTableScheme)
                .then((result)=>{

                })
                .catch((e)=>{

                    if(e.message.includes("errno: 150")){

                        console.error("Error : Please consider using BIGINT.UNSIGNED in your foreign key ( refrence ) data type rather than BIGINT.SIGNED or BIGINT.");

                    }

                })
                
            } catch (e) {
                
                console.log("exeption create table",e);

            }

        });
        
    }


}

module.exports = Main;