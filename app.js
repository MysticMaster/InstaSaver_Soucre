const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require("dotenv").config();
const i18n = require('i18n');
const glob = require('glob');
const axios = require('axios');
const {parse} = require("node-html-parser");
const fs = require('fs').promises; //.promises
const {v4: uuidv4} = require('uuid');
const bodyParser = require("body-parser");

const app = express();

// view engine setup
app.set(bodyParser.urlencoded({extended: false}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

i18n.configure({
    locales: [
        "af",
        "sq",
        "am",
        "ar",
        "hy",
        "az",
        "eu",
        "be",
        "bn",
        "bs",
        "bg",
        "ca",
        "ceb",
        "zh-CN",
        "zh-TW",
        "co",
        "hr",
        "cs",
        "da",
        "nl",
        "en",
        "eo",
        "et",
        "fi",
        "fr",
        "fy",
        "gl",
        "ka",
        "de",
        "el",
        "gu",
        "ht",
        "ha",
        "haw",
        "iw",
        "hi",
        "hmn",
        "hu",
        "is",
        "ig",
        "id",
        "ga",
        "it",
        "ja",
        "jv",
        "jw",
        "kn",
        "kk",
        "km",
        "ko",
        "ku",
        "ky",
        "lo",
        "la",
        "lv",
        "lt",
        "lb",
        "mk",
        "mg",
        "ms",
        "ml",
        "mt",
        "mi",
        "mr",
        "mn",
        "my",
        "ne",
        "no",
        "ny",
        "ps",
        "fa",
        "pl",
        "pt",
        "pa",
        "ro",
        "ru",
        "sm",
        "gd",
        "sr",
        "st",
        "sn",
        "sd",
        "si",
        "sk",
        "sl",
        "so",
        "es",
        "su",
        "sw",
        "sv",
        "tl",
        "tg",
        "ta",
        "te",
        "th",
        "tr",
        "uk",
        "ur",
        "uz",
        "vi",
        "cy",
        "xh",
        "yi",
        "yo",
        "zu"],
    directory: __dirname + '/language',
    cookie: 'lang',
    header: 'accept-language'
});

app.use(i18n.init);

const language_dict = {};
// Sử dụng Promise.all để đợi cho tất cả các lời hứa được giải quyết trước khi tiếp tục
Promise.all(glob.sync('../language/*.json').map(async (file) => {
    const dash = file.split(path.sep);
    console.log("dash " + dash.length)
    if (dash.length >= 2) {
        const dot = dash[2].split(".");
        if (dot.length === 2) {
            const lang = dot[0];
            try {
                const data = await fs.readFile(file, 'utf8');
                console.log("data - " + data)
                language_dict[lang] = JSON.parse(data);
            } catch (err) {
                console.error(err);
            }
        }
    }
})).then(() => {
    // Ở đây bạn có thể đặt mã xử lý mà bạn muốn thực hiện sau khi tất cả các tệp đã được đọc và xử lý.
    console.log(__dirname + '/language/')
    console.log('All files processed successfully');
    console.log(language_dict);
}).catch((error) => {
    console.error('Error:', error);
});

// const language_dict = {};
// glob.sync('./language/*.json').forEach(function (file) {
//     let dash = file.split(path.sep);
//     if (dash.length === 2) {
//         let dot = dash[1].split(".");
//         if (dot.length === 2) {
//             let lang = dot[0];
//             fs.readFile(file, function (err, data) {
//                 if (err) {
//                     console.error(err);
//                     return;
//                 }
//                 language_dict[lang] = JSON.parse(data.toString());
//             });
//         }
//     }
// });

/* GET home page. */
app.get('/', function (req, res, next) {
    let lang = 'en';
    console.log(language_dict)
    i18n.setLocale(req, lang);
    res.render('index', {lang: lang});
});

app.get('/:lang', function (req, res, next) {
    // lấy ra địa chỉ truy vấn
    const q = req.url;
    // tách ra language code từ địa chỉ truy vấn
    const pathAndQuery = q.split("?");
    const path = pathAndQuery[0];
    let dash = path.split("/");
    let lang = undefined
    console.log(lang)
    if (dash.length >= 2) {
        let code = dash[1];
        console.log("code " + code)
        if (code !== '' && language_dict.hasOwnProperty(code)) {
            lang = code;
        } else {
            next(createError(404))
            return
        }
    }
    if (lang == undefined) lang = 'en'
    i18n.setLocale(req, lang)
    res.render('index', {lang: lang});
});

function isInstagramStoriesLink(url) {
    return url.includes('stories');
}

app.post('/', async (req, res) => {
    try {
        const url = req.body.url;
        const language = req.body.lang;
        i18n.setLocale(req, language);
        if (!url || !url.startsWith('https://www.instagram.com/')) {
            return res.render("index", {lang: language, error: 0});
        }

        const videos = [];

        const options = {
            method: 'POST',
            url: 'https://instagram120.p.rapidapi.com/api/instagram/links',
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': '16a490b4f8msh223ff679ca0b62fp181abdjsnc4beeb2c44d0',
                'X-RapidAPI-Host': 'instagram120.p.rapidapi.com'
            },
            data: {
                url: url
            }
        };

        try {
            if (isInstagramStoriesLink(url)) {
                const response = await axios.request(options);
                response.data.result.forEach(obj => {
                    if (obj.video_versions) {
                        videos.push({
                            src: obj.video_versions[0].url,
                            thumbnail: "https://ig.instasaver.me/?url=" + obj.image_versions2.candidates[0].url,
                            type: 'mp4'
                        });
                    } else {
                        videos.push({
                            src: obj.image_versions2.candidates[0].url,
                            thumbnail: "https://ig.instasaver.me/?url=" + obj.image_versions2.candidates[0].url,
                            type: 'jpg'
                        });
                    }
                });

                res.render('index', {videos: videos, lang: language});
            } else {
                const response = await axios.request(options);

                response.data.forEach(obj => {

                    let thumbnail = ""
                    if (obj.pictureUrl.endsWith("&dl=1")) {
                        thumbnail = obj.pictureUrl.substring(0, obj.pictureUrl.length - 5);
                    } else {
                        thumbnail = obj.pictureUrl;
                    }

                    videos.push({
                        src: obj.urls[0].url,
                        thumbnail: "https://ig.instasaver.me/?url=" + thumbnail,
                        type: obj.urls[0].extension
                    });
                });
                res.status(200).render('index', {videos: videos, lang: language});
            }

        } catch (error) {
            console.error("Timeout: ", error);
            return res.render("index", {error: 1});
        }

    } catch (error) {
        console.log('Error: ', error);
        return res.render("index", {error: 1});
    }

});

app.post('/download', async (req, res) => {
    try {
        const url = req.body.url;
        downloadVideo(url, res)
            .then(() => {
                console.log('Video downloaded successfully.');
            })
            .catch(err => console.error('An error occurred:', err));
    } catch (error) {
        console.log('Error: ', error);
    }
});

function generateRandomString() {
    const randomNumbers = Math.floor(Math.random() * 100000);
    const randomString = "video" + randomNumbers.toString().padStart(5, '0');
    return randomString;
}

async function downloadVideo(url, res) {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    });

    const path = `./public/data/${generateRandomString()}.mp4`;
    const writer = fs.createWriteStream(path);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            res.download(path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    fs.unlink(path, err => {
                        if (err) {
                            console.error("Failed to delete file:", err);
                            reject(err);
                        } else {
                            console.log('File deleted successfully.');
                        }
                    });
                    resolve();
                }
            });
        });
        writer.on('error', reject);
    });
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
