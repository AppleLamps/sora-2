module.exports = {
    setToken: function (userContext, events, done) {
        // For local load test, set a static token generated from your dev auth or mock middleware
        userContext.vars.token = process.env.LOAD_TEST_TOKEN || 'devtoken';
        return done();
    },
};
