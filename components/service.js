/*        service.js           */

/* define service for main module   */

(function(){

	//define service module
	var appService = angular.module("appService", ["firebase"]);

	//add Auth service for user auth related methods
	appService.factory('Auth', ['$firebaseAuth', function($firebaseAuth){
		var Auth = {};
		var ref = new Firebase("https://popping-heat-1428.firebaseio.com");
		var auth = $firebaseAuth(ref);

		/*
			auth: auth object from firebase
			ref: reference for vote branch
			login: method, login for user using email and password
			logout: method, logout a user
			checkState: method, check user auth status
			add: create a new user by email and password
		*/
		
		Auth = {
			auth: auth,
			ref: ref,
			login: function(email, password){
				return auth.$authWithPassword({email: email, password: password});
			},
			logout: function(){
				return auth.$unauth();
			},
			checkState: function(){
				return auth.$requireAuth().$$state.status;
			},
			add: function(email, password){
				return auth.$createUser({email: email, password: password});
			}
		};

		return Auth;
	}]);

	//add Vote service for vote related methods
	appService.factory('Vote', ['$firebaseObject', '$firebaseArray', function($firebaseObject, $firebaseArray){
		var Vote = {};
		var ref = new Firebase("https://popping-heat-1428.firebaseio.com/votes");
		var votes = $firebaseArray(ref);

		/*
			all: firebase object for all the records in vote branch
			ref: reference of vote branch
			get: retrieve a specific vote by id
			single: firebase object for a specific vote
		*/

		Vote = {
			all: votes,
			ref: ref,
			add: function(newVote){
				return votes.$add(newVote);
			},
			get: function(voteId){
				return votes.$getRecord(voteId);
			},
			single: function(voteId){
				return $firebaseObject(ref.child(voteId));
			}
		};

		return Vote;
	}]);

	//add History service for user voting history related methods
	appService.factory('History', ['$firebaseArray', function($firebaseArray){
		var History = {};
		var ref = new Firebase("https://popping-heat-1428.firebaseio.com/history");
		var history = $firebaseArray(ref);

		/*
			ref: reference for history branch
			all: firebase object for all the records in history branch
			checkExists: check if the record for specific vote exists under this user
		*/

		History = {
			ref: ref,
			all: function(userId){
				return $firebaseArray(ref.child(userId));
			},
			add: function(userId, voteId, optionIndex){
				return $firebaseArray(ref.child(userId)).$add({
					date: new Date().getTime(),
					id: voteId,
					option: optionIndex
				});
			},
			checkExists: function(userId, voteId){
				var records = $firebaseArray(ref.child(userId));
				console.log(records);
			}
		};

		return History;
	}]);

	//add total filter to convert the rate of each option into total voting rate
	appService.filter('total', function(){
		return function(obj){
			var totalNumber = 0;
			var options = obj.options;
			angular.forEach(options, function(data){
				totalNumber += data.rate;
			});
			return totalNumber;
		}
	});

})();