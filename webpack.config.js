module.exports = {
	entry: "./src/entry",
    output: {
        path: __dirname + "/dist",
        filename: "msxplay-bundle.js"
    },
    module: {
    	noParse:[
    		/build\/libkss\.js$/,
    		/src\/libmgsc\.js$/
    	]
    }
};
