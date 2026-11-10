/* config.js: logins + online database (Firebase project "kiwi-corner").

   This web config is meant to be public (every Firebase website ships it).
   What keeps the data safe: the Firebase logins + the rules in firestore.rules.
   No passwords or password codes live in this file. */
globalThis.KIWI_CONFIG = {
  firebase: {
    apiKey: "AIzaSyA-THEfvyOC78h55xm3JoksOfkcAHxyI1g",
    authDomain: "kiwi-corner.firebaseapp.com",
    projectId: "kiwi-corner",
    storageBucket: "kiwi-corner.firebasestorage.app",
    messagingSenderId: "424504637878",
    appId: "1:424504637878:web:798fca89e9219d364aa917"
  },

  // Added to every PIN before it's sent to Firebase (Firebase needs 6+ characters).
  pepper: "-kiwicorner",

  // username → Firebase account
  users: {
    wifey: { email: "livina@mywifelivina.com", role: "livina", name: "Livina" },
    admin: { email: "admin@mywifelivina.com",  role: "admin",  name: "Chengxuan" }
  }
};
