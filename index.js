var SELECTED = []
let DB;
const databse = () => {
    const config = {
        locateFile: filename => `/db/${filename}`
    };

    initSqlJs(config).then(function (SQL) {
        DB = new SQL.Database();
        DB.run(`CREATE TABLE 'zaznamy' (
            _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            jmeno CHAR(64) NOT NULL,
            prijmeni CHAR(64) NOT NULL,
            datum CHAR(10))`)
        console.log("%cDb was created", "color:lightblue");
        console.log(`DB NAME: %c${DB.filename}`, 'color:lightblue;font-weight:bold')
    });
}


function addClicked(elem) {
    const parent = $(elem).closest('tr');
    if (!parent.hasClass('checked')) {
        parent.addClass('checked');
        SELECTED.push(parent)
    } else {
        parent.removeClass('checked');
        SELECTED = SELECTED.filter(function (item) {
            return item[0] !== parent[0]
        })
    }
}
function changeStyle(ele, state) {
    const elem = $(ele)
    if (state === 'sending') {
        elem.addClass('sending')
        elem.text('Odesílám...')
    } else if (state === 'done') {
        elem.removeClass('sending')
        elem.addClass('sent')
        elem.text('Odesláno')

        setTimeout(function () {
            elem.removeClass('sent')
            elem.text('send to db')
        }, 3000)
    }
}


function sendToDB(elem) {
    const db = DB;
    changeStyle(elem, 'sending')
    $('#dataTable').find('tbody').children().each(function (_, item) {
        const row = {}
        $.each(item.children, function (index, td) {
            const key = $('thead').children()[index].innerText
            if (key === 'id') {
                var id = $(td).text().replace('.', '')
                row[key] = --id
            } else if (key === 'date') {
                var dateParts = $(td).text().split('.');
                var day = dateParts[0].trim();
                var month = dateParts[1].trim();
                var year = dateParts[2].trim();
                var formattedDate = `${year}-${month}-${day}`;
                row[key] = formattedDate;
            } else {
                row[key] = $(td).text()
            }
        })
        var userData = row;
        const sql = 'INSERT INTO zaznamy (jmeno, prijmeni, datum) VALUES (?, ?, ?)';
        const values = [userData.jmeno, userData.prijmeni, userData.date];
        db.run(sql, values);
    })
    $('#load').show()
    $('#load').removeClass('disabled')
    changeStyle(elem, 'done')
}

function retrieveDataFromDB() {
    $('#dataTable').children().remove()
    const db = DB
    const query = 'SELECT * FROM zaznamy';
    const results = db.exec(query);
    if (results && results[0] && results[0].values) {
        const data = results[0].values;
        let newTable = [];
        data.forEach(function (item) {
            let row = {};
            row['id'] = item[0];
            row['jmeno'] = item[1];
            row['prijmeni'] = item[2];
            row['date'] = item[3];
            newTable.push(row);
        })
        generateTable(newTable, true);
    } else {
        console.log('No data found.');
    }
}


function exportSelected() {
    if (SELECTED.length > 0) {
        const data = []
        const keys = $('thead').children().map(function (_, th) {
            return $(th).text()
        })
        $.each(SELECTED, function (_, item) {
            const row = {}
            $.each(item.children(), function (index, td) {
                if (keys[index] === 'id') {
                    var id = $(td).text().replace('.', '')
                    row[keys[index]] = --id
                } else if (keys[index] === 'date') {
                    var dateParts = $(td).text().split('.');
                    var day = dateParts[0].trim();
                    var month = dateParts[1].trim();
                    var year = dateParts[2].trim();
                    var formattedDate = `${year}-${month}-${day}`;
                    row[keys[index]] = formattedDate;

                } else {
                    row[keys[index]] = $(td).text()
                }
            })
            data.push({ ...row })
        })
        download(JSON.stringify(data, null, 4), 'export.json', 'text/json;encoding:utf-8')
    }
}

function download(data, nazevSouboru, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = $('<a>', {
        href: url,
        download: nazevSouboru
    }).css('display', 'none');
    $('body').append(a);
    a[0].click();
    window.URL.revokeObjectURL(url);
    a.remove();
}



function generateTable(data, isSQL) {
    console.clear()
    if (!isSQL) $('#dataTable').empty();
    if (data) {
        const table = $('<table>');
        const thead = $('<thead>');
        const tbody = $('<tbody>');
        const keys = Object.keys(data[0]);

        $.each(keys, function (_, key) {
            const th = $('<th>').text(key);
            thead.append(th);
        });

        $.each(data, function (_, item) {
            const tr = $('<tr>').hide();
            $.each(keys, function (_, key) {
                const td = $('<td onclick="addClicked(this)">');
                if (key === 'date') {
                    const date = new Date(item[key]);
                    td.text(date.toLocaleDateString('cs-CZ'));
                } else {
                    if (key === 'id') {
                        var id = item[key]
                        var textID = isSQL ? `[SQL] ${id + '.'}` : `${++id + '.'}`
                        td.text(textID)
                    } else {
                        td.text(item[key]);
                    }
                }
                tr.append(td);
            });
            tbody.append(tr);
            tr.fadeIn(120);
        });
        table.append(thead);
        table.append(tbody);
        $('#dataTable').append(table);
    }
}

$(document).ready(function () {
    databse()
    $('#import').click(function () {
        if ($('tbody').children().length > 0) return;
        $.ajax({
            url: 'https://www.3it.cz/test/data/json',
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                generateTable(data, false);
            },
            error: function (error) {
                console.error(error);
            }
        });
    });
});
