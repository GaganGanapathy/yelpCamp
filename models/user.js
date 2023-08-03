const mongoose = require("mongoose")
const Schema = mongoose.Schema
const passportLocalMongoose = require("passport-local-mongoose")

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
})

// automatically adds a hased and salted username and password to the schema
UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", UserSchema)
