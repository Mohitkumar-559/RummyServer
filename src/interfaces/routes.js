"use strict"
// import usersController from './controller/usersController.js';
// import authController from './controller/authController.js';
// import searchController from './controller/searchController.js';
const usersController = require("../../src/domain/user/service.js");
// const  {rabbitMQ} = require("../boot")
const { authenticateSocketConnection_ } = require("../domain/socket/middlewares/authentication");
module.exports = function routes(route) {
    route.get('/', (request, response) => {
        response.send(`Api server in running (${new Date()})`);
    });
    // route.get('/api/game/test', (request, response) => {
    //     console.log(rabbitMQ)
    //     return response.send(rabbitMQ);
    // });
    route.post('/', (request, response) => {
        response.send(`Api server in running (${new Date()})`);
    });
    route.use('/api/game/join', async (req, res, next) => {
        let getdata = await authenticateSocketConnection_(req)
        req.body.profile = getdata
        next()
      }, (req, res, next) => {
        console.log('Request Type:', req.method)
        next()
      })


      
    route.route('/api/v1/constest/config').get(async (req, response) => {
        const configs = await usersController.getAllLobbyConfig();
        console.log("configs response", configs);
        return response.json({ lobbies: configs });
    });
   
    route.route('/api/game/join').post(async (req, response) => {
        const configs = await usersController.joinGame(req);
        console.log("configs response", configs);
        return response.json({ lobbies: configs });
    });

    

    //   route.route('/auth/login').post(authController.login);

    //   route.route('/auth/verify').post(authController.verify);

    //   route.route('/auth/register').post(authController.register);

    //   route.route('/users').get(usersController.getAll).post(usersController.create);

    //   route.route('/users/:id').get(usersController.getOne).put(usersController.update).delete(usersController.delete);

    //   route.route('/search').post(searchController.search);
};
