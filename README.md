# Sequelize True Migration

I am able to form your "Sql-Based Database" connected to "Sequelize" to look like "Sequelize Models" in your "Sequelize Model Schemes"

# What is Migration ?

**Migration** is the process of moving from one to another **Form** of **Database**
Since **Migration** is version-based process and is reversible, our auto-migration system doesn't generate a single version file and do the changing and adding automatically. so you can't call it a migration it self but auto-migration.

# Using 

> **Caution :** It's still in Beta phase so don't expect a very clean output although it won't delete or overwrite on your data **Yet**. But in the next updates we will add some features that includes doing this. **Although** it will come with granting your permission by **Options** parameter.

## Getting Started

Suppose you have a object of "Sequelize" :

```javascript

const options = {
    host   : host,
    port   : port,
    dialect: 'mysql',
    define : {
        charset: 'utf8',
        collate: 'utf8_general_ci',
    }
};

const  sequelize = new  Sequelize(tableName, userName, password, options);

```

Add "INFORMATION_SCHEMA" Database as a "Sequelize" Object Beside it ( in current runned "SQL-Based Database System" instance ) like below:

```javascript

const options = {
    host   : host,
    port   : port,
    dialect: 'mysql',
    define : {
        charset: 'utf8',
        collate: 'utf8_general_ci',
    }
};

const  sequelize = new  Sequelize(tableName, userName, password, options);
const sequelizeInfo = new Sequelize('INFORMATION_SCHEMA', userName, password, options);

```
And then add "sequelize-true-migration" package and Create new Object with "new" and call "synchronize" method for Syncing model with database:

```javascript
const SequelizeTrueMigration = require('sequelize-true-migration');
const stmObj = new SequelizeTrueMigration(name,sequelize,sequelizeInfo,database,{
    forceTruncate:false
})

stmObj.synchronize();
```

> **Caution :** For getting affected restart your project. probably like this :

### In Runner Systems :
- Nodemon : On saving files
- PM2 : 
```sh
  pm2 restart %Name-Of-Your-Project%
```
- Pure Node : 
```sh
  Ctrl+c ( On running project )
  node %Main-Project-File%.js
```

And Done. No need to Do Anything.

# Development Progress
- [x] Main Development
- [x] Checing Tables and Create a NOT EXIST Table
- [x] Checing Columns and Create a NOT EXIST Column in Tables
- [x] Matching Columns and Model Definition and Fix Conflicts ( or Error On Something that needed Developer Attention)
- [ ] Deleting Undefined Columns that corresponds in Models
- [ ] Versioning Migrations and Rollback System
- [ ] Writing Tests
