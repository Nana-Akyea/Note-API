const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        minLength: 2

    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true

    },
    
    password: {
        type: String,
        required: true,
        select: false
    },
},
 { timestamps: true}
);

const UserModel = mongoose.model("User", userSchema)
module.exports = UserModel;
