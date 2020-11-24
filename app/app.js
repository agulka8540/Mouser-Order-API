var express = require('express');
var app = express();

var cors = require('cors');
app.use(cors({
    origin: 'localhost:3000'
  }));
app.set('view engine', 'ejs');
app.set('views', 'app/views');

app.use(express.static('app/public'));
app.use(require('./routes/index'));

var server = app.listen(3000);