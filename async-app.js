var originRequest = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var async = require('async');
var express = require('express');

var app = express();
var url = 'http://202.96.245.182/xxcx/fwjg.jsp?lmbm=060305';
var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
};

app.get('/', function (req, res) {
    function request(url, /*formData,*/ callback) {
        var options = {
            url: url, // ImoNote: 这个网站 url 里还是要带 pageno 参数的（和控制台看到的不一样 Orz 无语中。。）
            encoding: null,
            headers: headers
            // formData: formData
        };
        originRequest.post(options, callback);
    }

    function wrapHTML(content) {
        return '<!DOCTYPE html>' +
            '<html lang="en">' +
            '<head>' +
            '<meta charset="UTF-8">' +
            '<title>上海医保 - 街道(镇)医保事务服务点</title>' +
            '</head>' +
            '<body>' +
            content.join("") +
            '</body>' + '</html>';
    }

    request(url, /*formDataForPage(1),*/ function (error, response, body) {
        var html = iconv.decode(body, 'gbk');

        var $ = cheerio.load(html);
        var pageElements = $("#m_content .yypages a");
        var index = pageElements.length - 2; // 倒数第二个 a（最后一页）
        var totalPages = parseInt(pageElements.eq(index).text());
        var pages = [];
        for (var i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        var urls = pages.map(function (pageNo) {
            return url + '&pageno=' + pageNo;
        });

        async.mapLimit(urls, 3, function (url, callback) {
            var pageNum = url.split('=').pop();
            request(url, function (error, response, body) {
                if (error) {
                    console.log("Page " + pageNum + "'s crawl failed :(");
                    pageFailedCount++;

                    // ep.emit('table_html', [pageNum, ""]);
                    callback(error, null);
                } else {
                    console.log("Page " + pageNum + "'s crawl succeed :)");
                    var html = iconv.decode(body, 'gbk');
                    var $ = cheerio.load(html);
                    var pageNav = $("#m_content .yypages");
                    var table = pageNav.prev();
                    var tableHTML = $.html(table);
                    var titleHTML = "<h2>第 " + pageNum + " 页的 table</h2>";

                    // ep.emit('table_html', [pageNum, tableHTML])
                    return callback(null, titleHTML + tableHTML);
                }
            });
        }, function (err, results) {
            if (err) {
                res.send(err);
            } else {
                res.send(wrapHTML(results));
            }
        });
    });
});

app.listen(1234, function () {
    console.log("app is listening at port 1234");
});