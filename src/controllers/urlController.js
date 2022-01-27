const urlModel = require("../models/urlModel")
const shortid = require('shortid');
const baseUrl = 'http://localhost:3000'
const validUrl = require('valid-url')
const redis = require("redis");

const { promisify } = require("util");

//This is the First Post Api to Create Longer to Shorten URL...

// Connect to redis
const redisClient = redis.createClient(13242, "redis-13242.c264.ap-south-1-1.ec2.cloud.redislabs.com", { no_ready_check: true });
//O0qgthX3x2oqCLz18TzoDCauyozlbC97
redisClient.auth("cnRooWJbrlpqBW4B7l7LtreKvkigULlL", function (err) {
    if (err) throw err;
});
redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const createUrl = async function (req, res) {
    try {
        if (!(Object.keys(req.body).length > 0)) { // Checking Body is not Empty
            res.status(400).send("No Url Found...!!")
        }

        const longUrl = req.body.longUrl;

        if (!validUrl.isUri(baseUrl)) { // Base Url is Valid or not
            res.status(400).send("Invalid Base Url")
        }

        if (!/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(
            longUrl
        )) {
            return res
                .status(400)
                .send({ status: false, message: `This is not a valid Url` });
        }

        if (
            (longUrl.includes("https://") &&
                longUrl.match(/https:\/\//g).length !== 1) ||
            (longUrl.includes("http://") &&
                longUrl.match(/http:\/\//g).length !== 1) ||
            (longUrl.includes("ftp://") && longUrl.match(/ftp:\/\//g).length !== 1)
        ) {
            return res.status(400).send({ status: false, msg: "Url is not valid" });
        }

        if (!/(.com|.org|.co.in|.in|.co|.us)/.test(longUrl)) {
            return res.send("Url is not valid");
        }

        if (
            longUrl.includes("w") &&
            (longUrl.indexOf("w") === 6 ||
                longUrl.indexOf("w") === 7 ||
                longUrl.indexOf("w") === 8)
        ) {
            let arr = [];
            let i = longUrl.indexOf("w");
            while (longUrl[i] == "w") {
                if (longUrl[i] === "w") {
                    arr.push(longUrl[i]);
                }
                i++;
            }

            if (!(arr.length === 3)) {
                return res
                    .status(400)
                    .send({ status: false, msg: "Url is not valid " });
            }
        }

        if (validUrl.isUri(longUrl)) {
            const urlToken = shortid.generate();
            let checkUrl = await urlModel.findOne({ longUrl })
            if (checkUrl) {
                return res.send({ message: " You already created Short Url for this Long Url :", data: checkUrl })

            } else {
                const shortUrl = baseUrl + '/' + urlToken;
                const storedData = { longUrl, shortUrl, urlCode: urlToken }
                let savedData = await urlModel.create(storedData)
                res.status(200).send({ status: true, data: savedData })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid Long Url" })
        }

    } catch (e) {
        res.status(500).send(e.message);
    }

}






const getUrl = async function (req, res) {
    try {
        const urlCode1 = req.params.urlCode;

        let catchData = await GET_ASYNC(`${req.params.urlCode}`)
        if (catchData) {
            const FetchData = JSON.parse(catchData)
            console.log("data fetch", FetchData)
            res.redirect(FetchData.longUrl)
        } else if (urlCode1) {
            const urlFind = await urlModel.findOne({ urlCode: urlCode1 })
            if (urlFind) {
                const abc = await SET_ASYNC(`${urlCode1}`, JSON.stringify(urlFind), "EX", 20)
                console.log("Data Got Stored", abc)
                return res.redirect(urlFind.longUrl)
            } else {
                res.status(400).send("There is no Short Url Found")
            }
        } else {
            return res.status(404).send("No Url Code Params Found")
        }

        // const urlCode1 = req.params.urlCode;
        // if (urlCode1) {
        //     const urlFind = await urlModel.findOne({ urlCode: urlCode1 })
        //     console.log(urlFind)
        //     if (urlFind) {
        //         return res.redirect(urlFind.longUrl)
        //     } else {
        //         return res.status(400).send({ status: false, msg: "There is no short url Found" })
        //     }
        // } else {
        //     return res.status(404).send({ status: false, msg: "no url param found" })
        // }

    } catch (error) {
        return res.status(500).send(error.message);
    }
}


module.exports.createUrl = createUrl;
module.exports.getUrl = getUrl;