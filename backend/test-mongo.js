require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const test = async () => {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const username = "user_" + Math.floor(Math.random() * 10000);
        const password = "password123";

        console.log("Creating user instance...");
        const user = new User({ username, password });

        console.log("Calling user.validate()...");
        try {
            await user.validate();
            console.log("Validation passed");
        } catch (ve) {
            console.error("❌ Validation error details:");
            console.error(JSON.stringify(ve, null, 2));
            throw ve;
        }

        console.log("Calling user.save()...");
        try {
            await user.save();
            console.log("User saved successfully");
        } catch (se) {
            console.error("❌ Save error details:");
            console.error(se);
            throw se;
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ OVERALL FAILURE:");
        console.error(error.message);
        process.exit(1);
    }
};

test();
