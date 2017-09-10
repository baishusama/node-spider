var originRequest = require('request');
// var superagent = require('superagent');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var eventproxy = require('eventproxy');
var express = require('express');

var app = express();
var url = 'http://202.96.245.182/xxcx/fwjg.jsp?lmbm=060305';
var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
};

app.get('/', function (req, res) {
    /*superagent.get('http://202.96.245.182/xxcx/fwjg.jsp?lmbm=060305')
     .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*!/!*;q=0.8')
     .set('Accept-Encoding', 'gzip, deflate')
     // .set('Accept-Encoding', null)
     // .set('Accept-Language', 'zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4,zh-TW;q=0.2')
     .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36')
     .end(function(err, sres){
     if(err){
     return next(err);
     }

     console.log("sres's type :", typeof sres);
     console.log("sres owns properties :", Object.keys(sres));

     var temp = new Buffer(sres.text);

     console.log("\n\nsres.text :", sres.text);
     console.log("\n\ntemp :", temp);
     var unicodeHTML = iconv.decode(temp, 'gbk');
     // var utf8HTML = iconv.encode(unicodeHTML, 'utf-8');
     // var html = sres.text;
     // var $ = cheerio.load(utf8HTML);
     var $ = cheerio.load(unicodeHTML);
     // var $ = cheerio.load(sres.text);
     var items = [];
     $("#m_content table table tr").each(function (index, element) {
     var $element = $(element);
     items.push($element.text());
     // items.push($element);
     });

     res.send(items);
     });*/

    function request(url, formData, callback) {
        var options = {
            url: url + "&pageno=" + formData['pageno'], // ImoNote: 这个网站 url 里还是要带 pageno 参数的（和控制台看到的不一样 Orz 无语中。。）
            encoding: null,
            headers: headers,
            formData: formData
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

    function formDataForPage(number) {
        if (number) {
            return {
                'pageno': number.toString(),
                'lmbm': "060305"
            };
        }
        return {
            'pageno': "1",
            'lmbm': "060305"
        };
    }

    request(url, formDataForPage(1), function (error, response, body) {
        var html = iconv.decode(body, 'gbk');

        var $ = cheerio.load(html);
        var items = [];
        var pages = $("#m_content .yypages a");
        // console.log("pages :", pages);
        var index = pages.length - 2; // 倒数第二个 a（最后一页）
        var totalPages = parseInt(pages.eq(index).text());

        var ep = new eventproxy();
        var pageFailedCount = 0;
        ep.after('table_html', totalPages, function (table_pairs) {
            console.log("Collected all pages! Going to generate result ~");
            table_pairs.sort(function (a, b) {
                return a[0] - b[0];
            });

            table_pairs.forEach(function (table_pair) {
                items.push("<h2>第 " + table_pair[0] + " 页的 table</h2>");
                items.push(table_pair[1]);
            });

            res.send(wrapHTML(items));
            console.log("页面解析完毕！kira~");
        });

        function requestGetTable(pageNum) {
            var data = formDataForPage(pageNum);
            console.log("data :", data);
            request(url, data, function (error, response, body) {
                // ImoNote: body here is a buffer, can be as the 1st parameter
                if (error) {
                    console.log("Page " + pageNum + "'s crawl failed :(");
                    pageFailedCount++;

                    ep.emit('table_html', [pageNum, ""]);
                } else {
                    console.log("Page " + pageNum + "'s crawl succeed :)");
                    // console.log("response's props :", Object.keys(response));
                    // console.log("response's req :", response.req);
                    var html = iconv.decode(body, 'gbk');
                    var $ = cheerio.load(html);
                    var pageNav = $("#m_content .yypages");
                    var table = pageNav.prev();
                    var tableHTML = $.html(table);

                    ep.emit('table_html', [pageNum, tableHTML])
                }
                // res.send(wrapHTML(items));
            });
        }

        // 遍历爬取所有页
        for (var i = 0; i < totalPages; i++) {
            // request(url, formDataForPage(i + 1),)
            requestGetTable(i + 1);
        }
    });

    /*request(url, formDataForPage(1), function (error, response, body) {
     // ImoNote: body here is a buffer, can be as the 1st parameter
     var html = iconv.decode(body, 'gbk');

     var $ = cheerio.load(html);
     var items = [];
     var pageNav = $("#m_content .yypages");
     var table = pageNav.prev();
     console.log("table :", table);
     // var tableHTML = table[0].outerHTML;
     var tableHTML = $.html(table);
     console.log("tableHTML :", tableHTML);
     items.push(tableHTML);
     /!*pageNav.prev().find('tr').each(function (index, element) {
     var $element = $(element);
     var text = $element.text()
     .replace(/\n/g, '');
     items.push(text);
     });*!/
     res.send(wrapHTML(items));
     });*/
});

app.listen(1234, function () {
    console.log("app is listening at port 1234");
});