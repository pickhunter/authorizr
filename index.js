const _     = require('lodash');


let getAbilities = (req, abilityMaker, userGetter) => {
  let abilities = [];
  
  let can = (action, resource) => {
    abilities.push({resource, action});
  };

  let user = userGetter(req);

  abilityMaker(user, can);

  return abilities;
};


let authorizer = {};

Object.assign(authorizer, {
  configure: {
    userBy: function(userGetterFn) {
      this.userGetter = userGetterFn;
    }.bind(authorizer),

    abilitiesBy: function(abilityMakerFn) {
      this.abilityMaker = abilityMakerFn;
    }.bind(authorizer)
  },

  getAbilities: function (req){
    return getAbilities(req, this.abilityMaker, this.userGetter);
  },

  authorize: function(action, resource) {
    return (req, res, next) => {
      let permittedActions = this.getAbilities(req)
        .filter(ability => _.includes([resource, 'everything'], ability.resource))
        .map(ability => ability.action);

      let bAuthorized = _.includes(permittedActions, 'manage') || _.includes(permittedActions, action);
      
      bAuthorized && next();

      !bAuthorized && next({status: 403});
    };
    
  },

  ensure: (role) => {
    return (req, res, next) => {
      let nextArg = null;
      if(req.role == role) {
        let passHandler = _.get(roleBasedHandlers, `${role}.onPass`);
        passHandler && passHandler(req, res);
      } else {
        let failHandler = _.get(roleBasedHandlers, `${role}.onFail`);
        failHandler && failHandler(req, res);
        nextArg = { status: 401 };
      }

      next(nextArg);
    };
  } 
});


module.exports = authorizer;