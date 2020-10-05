//Verification
class VerificationError extends Error {}

class TypeDefinitionMismatchError extends VerificationError {}
class CharMaxLengthMismatchError extends VerificationError {}

module.exports = {

    VerificationError,
    TypeDefinitionMismatchError,
    CharMaxLengthMismatchError

};