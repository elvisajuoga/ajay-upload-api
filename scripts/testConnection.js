require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in .env file');
      console.error('\n   Please add to your .env file:');
      console.error('   MONGODB_URI=your_connection_string_here');
      process.exit(1);
    }

    // Mask password in connection string for display
    const displayUri = mongoUri.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
    console.log('Testing MongoDB connection...');
    console.log(`Connection string: ${displayUri}\n`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('✅ Successfully connected to MongoDB!');
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Collections found: ${collections.length}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('\n💡 Authentication Error:');
      console.error('   Your MongoDB username or password is incorrect.');
      console.error('\n   Check your MONGODB_URI format:');
      console.error('   mongodb://username:password@host:port/database');
      console.error('   or for MongoDB Atlas:');
      console.error('   mongodb+srv://username:password@cluster.mongodb.net/database');
      console.error('\n   Make sure:');
      console.error('   1. Username and password are correct');
      console.error('   2. Special characters in password are URL-encoded');
      console.error('   3. The database user has proper permissions');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection Refused:');
      console.error('   Cannot reach MongoDB server. Check:');
      console.error('   1. MongoDB server is running');
      console.error('   2. Host and port are correct');
      console.error('   3. Firewall/network settings');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 DNS/Host Error:');
      console.error('   Cannot resolve MongoDB hostname. Check:');
      console.error('   1. Hostname in connection string is correct');
      console.error('   2. Internet connection is working');
      console.error('   3. For Atlas: cluster URL is correct');
    }
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
})();

