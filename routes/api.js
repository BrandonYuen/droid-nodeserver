const express = require('express');
const router = express.Router();

// // get a list of projects from db
// router.get('/projects', projectController.getList);

// // options for collection
// router.options('/projects', function(req, res, next){
// 	res.header('Allow', 'GET,POST,OPTIONS');
// 	res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
// 	res.header('Access-Control-Allow-Origin', '*');
// 	res.header('Access-Control-Allow-Credentials', true);
// 	res.header('Access-Control-Allow-Headers', 'Content-Type');
// 	res.sendStatus(200);
// });

module.exports = router;
