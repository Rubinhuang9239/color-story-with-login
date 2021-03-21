var datastore = require('nedb');

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var session = require('express-session');

var urlencodedBodyParser = bodyParser.urlencoded({extended:true});
app.use(urlencodedBodyParser);

app.use("/public", express.static(__dirname + "/public"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/library", express.static(__dirname + "/library"));
app.set('view engine', 'ejs');

app.use(
	session(
		{
			secret: 'secret',
			cookie: {
				    maxAge: 365 * 24 * 60 * 60 * 1000   // e.g. 1 year
				}
		}
	)
);

// ----- Util -------//

var bcrypt = require('bcrypt-nodejs');

//Hash password
function generateHash(password) {
	return bcrypt.hashSync(password);
}

function compareHash(password, hash) {
    return bcrypt.compareSync(password, hash);
}

// ------ user acount -------//

// account database:
var user_db = new datastore({filename: 'users.json', autoload: true});

app.get('/user_login', function(req,res){
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/user_register', function(req,res){
    res.sendFile(__dirname + '/public/register.html');
});

//Register
app.post('/register', function(req, res) {
    // see if duplicated username
    user_db.findOne({username: req.body.username}, function(err, doc){
        if(err){
            console.log(err);
            res.sendStatus(500);
            return;
        }
        if(!doc){
            // We want to "hash" the password so that it isn't stored in clear text in the database
            var passwordHash = generateHash(req.body.password);
            // The information we want to store
            var registration = {
                "username": req.body.username,
                "password": passwordHash
            };
            // Insert into the database
            user_db.insert(registration);
            console.log("inserted ===>", registration);
            // Give the user an option of what to do next
            res.send("Registered Sign In" );
            return;
        }
        console.log('User ' + req.body.username + ' exist');
        res.status(500).send('User ' + req.body.username + ' exist');
        return;
    });
});

// Post from login page
app.post('/login', function(req, res) {
	// Check username and password in database
	user_db.findOne({"username": req.body.username},
		function(err, doc) {
			if (doc != null) {
				// Found user, check password				
				if (compareHash(req.body.password, doc.password)) {				
					// Set the session variable
					req.session.username = doc.username;
					// Put some other data in there
					req.session.lastlogin = Date.now();
					res.redirect('/');
					
				} else {
					res.send("Invalid Try again");
				}
			} 
		}
	);
});

app.get('/logout', function(req, res) {
	delete req.session.username;
	res.redirect('/');
});	

// ------ user post -------//

// post database:
var post_db = new datastore({ filename: 'database.json', autoload: true });

// post a new public/private post
app.post('/storyhub',function(req,res){
    if(
        !req.session.username ||
        req.session.username===''
    ){
        res.redirect('/user_login');
        return;
    };

    var dataToSave = {
        story: req.body.story,
        storyColor: req.body.storyColor,
        visibility: req.body.visibility,
        timestamp: Date.now(),
        username: req.session.username
    };

    post_db.insert(dataToSave, function (err, newDoc) {   
        post_db.find({username: req.session.username}).sort({timestamp: -1}).exec(function(err,docs){
            var dataWrapper = {data: docs};
            res.render("storyhubtemplet.ejs", dataWrapper);
        });
    });
});

// request all post either public or private
app.get('/',function (req,res){
    if(
        !req.session.username ||
        req.session.username===''
    ){
        res.redirect('/user_login');
        return;
    };

    post_db.find({username: req.session.username}).sort({timestamp: -1}).exec(function(err,docs){
        if(err){
            console.log(err);
            res.sendStatus(500);
            return;
        }
        var dataWrapper = {data: docs};
        res.render("storyhubtemplet.ejs", dataWrapper);
    });
});

// request all public
app.get('/publicView',function (req,res){
    if(
        !req.session.username ||
        req.session.username===''
    ){
        res.redirect('/user_login');
        return;
    };

    post_db.find({visibility : 'publicView', username: req.session.username}).sort({timestamp: -1}).exec(function(err,docs){
        if(err){
            console.log(err);
            res.sendStatus(500);
            return;
        }
        var dataWrapper = {data: docs};

        console.log('Public Data ====>', dataWrapper);
        res.render("storyhubtemplet.ejs", dataWrapper);
    });
});

app.listen(80, function(){
    console.log('App listening on port 80!');
});
