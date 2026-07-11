// temp/test-hash.js
const { hashPassword } = require("@better-auth/utils/password");

(async () => {
    const hash = await hashPassword("Owner@123");
    console.log(hash);
})();