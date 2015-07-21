/*                  app.js                     */

/*         run, config and controllers         */

(function(){

	//define a main module for just-vote
	var app = angular.module("app", ["firebase", "appService", "ngRoute"]);

	//run this code before parsing each controller
	app.run(function($rootScope, $location){
		//firebase official method for user auth checking
		$rootScope.$on("routeChangeError", function(event, next, previous, error){
			if(error === "AUTH_REQUIRED"){
				$location.path("/login");
			}
		});
		//user auth checking, if user is unauth, navigate to login page
		$rootScope.$on("requiredAuth", function(event, data){
			if(data == "positive"){
				$location.path("/login");
			}
		});
	});

	//define routers
	app.config(function($routeProvider){
		$routeProvider.when("/login", {
			templateUrl: "./views/login.html",
			controller: "appCtrl"
		})
		.when("/list", {
			templateUrl: "./views/list.html",
			controller: "listCtrl",
			//obtain user auth status before router runs,
			//the same method for other routers
			resolve: {
				currentAuth: function(Auth){
					//return Auth.$requireAuth();
					if(Auth.checkState() == 2){
						return false;
					}
					return true;
				}
			}
		})
		.when("/item/:id", {
			templateUrl: "./views/item.html",
			controller: "itemCtrl",
			resolve: {
				currentAuth: function(Auth){
					//return Auth.$requireAuth();
					if(Auth.checkState() == 2){
						return false;
					}
					return true;
				},
			}
		})
		.when("/user", {
			templateUrl: "./views/user.html",
			controller: "userCtrl",
			resolve: {
				currentAuth: function(Auth){
					//return Auth.$requireAuth();
					if(Auth.checkState() == 2){
						return false;
					}
					return true;
				}
			}
		})
		.when("/create", {
			templateUrl: "./views/create.html",
			controller: "createCtrl",
			resolve: {
				currentAuth: function(Auth){
					//return Auth.$requireAuth();
					if(Auth.checkState() == 2){
						return false;
					}
					return true;
				}
			}
		})
		.otherwise("/list", {
			templateUrl: "./views/list.html",
			controller: "listCtrl",
		});
	});

	//define controllers for just-vote
	//main controller, contain other child controllers
	app.controller('appCtrl', ['$scope', '$location', 'Auth', function($scope, $location, Auth){
		//connect Auth service to scope
		$scope.Auth = Auth;
		//never show the content before data is loaded
		$scope.showReady = false;
		//retrieve user auth info
		$scope.Auth.auth.$onAuth(function(authData){
			$scope.authData = authData;
		});

		//login method for login btn
		//if login successfully, navigate to votes list
		//otherwise, display error message
		$scope.login = function(){
			$scope.Auth.login($scope.email, $scope.passwd)
			.then(function(authData){
				$scope.authData = authData;
				$location.path("/");
			})
			.catch(function(error){
				$scope.error = error.toString();
				$scope.passwd = "";
			});
		}

		//logout method for logout btn
		//navigate to login page after logout
		$scope.logout = function(){
			$scope.Auth.logout();
			$location.path("/login");
		}


		//register 'readyToShow' event
		$scope.$on("readyToShow", function(event){
			$scope.showReady = !$scope.showReady;
		});
	}]);

	//controller for list view
	app.controller('listCtrl', ['$scope', 'currentAuth', 'Vote', function($scope, currentAuth, Vote){
		/*
		$scope.currentAuth = currentAuth;
		console.log($scope.currentAuth);
		if($scope.currentAuth){
			$scope.$emit("routeChangeError", $scope.currentAuth);
		}
		*/
		if(!currentAuth){
			$scope.$emit("requiredAuth", "positive");
		}

		//retrieve all the vote items from firebase
		$scope.votes = Vote.all;

		//when data is loaded, emit the 'readyToShow' event for showing the content
		$scope.votes.$loaded(function(data){
			$scope.$emit("readyToShow");
		}, 
		function(error){
			console.log(error);
		});

	}]);


	//controller for item view
	app.controller('itemCtrl', ['$scope', 'currentAuth', '$routeParams', 'Vote', 'History', 
		function($scope, currentAuth, $routeParams, Vote, History){

		if(!currentAuth){
			$scope.$emit("requiredAuth", "positive");
		}
		
		/*
			$scope.disableSubmit ~ disable vote btn if no option is selected
			$scope.selected ~ record the index of selected option
			$scope.totalRate ~ save the total rating number for a vote
			$scope.Id ~ retrieve vote id from router
			$scope.showResult ~ if finish voting, show voting result
			$scope.showItem ~ determine if the vote content is shown
		*/
		$scope.disableSubmit = true;
		$scope.selected = 0;
		$scope.totalRate = 0;
		$scope.voteId = $routeParams.id;

		$scope.showResult = false;
		$scope.showItem = false;

		//check if the user has voted for this vote
		$scope.checkExists = function(){
			var record = {};
			//retrieve history record from firebase
			$scope.history.ref.child($scope.authData.uid).once("value", function(snapshot){
				record = snapshot.val();
				angular.forEach(record, function(data){
					if(data.id == $scope.voteId){
						console.log("record exists, show results");
						//return true;
						$scope.showResult = true;
					}
				});
				$scope.showItem = true;
			});
		}

		//show the vote btn and record option index if any option is selected
		$scope.select = function(index){
			$scope.selected = index;
			console.log($scope.selected);
			if($scope.disableSubmit){
				$scope.disableSubmit = !$scope.disableSubmit;
			}
		}

		//proceed voting for vote btn
		$scope.submit = function(){
			//increase the rate for selected option
			$scope.vote.options[$scope.selected].rate++;
			//update the record from firebase
			$scope.vote.$save().then(function(ref){
				console.log(ref.key() == $scope.vote.$id);
				//$scope.showResult = true;
			});
			//add user voted history to firebase
			$scope.history.add($scope.authData.uid, $scope.vote.$id, $scope.selected)
			.then(function(ref){
				console.log(ref.key() + "vote is updated");
				$scope.showResult = true;
			});
		}

		//connect Vote service to scope
		$scope.vote = Vote.single($scope.voteId);
		//if data is loaded, show total voters of this vote
		$scope.vote.$loaded(function(data){
			angular.forEach(data.options, function(data){
				$scope.totalRate = $scope.totalRate + data.rate;
			});
		}, 
		function(error){
			console.log(error);
		});

		//connect History service to scope
		$scope.history = History;

		//$scope.showResult = $scope.checkExists();
		$scope.checkExists();
	}]);

	app.controller('userCtrl', ['$scope', 'currentAuth', 'History', 'Vote',
		function($scope, currentAuth, History, Vote){
		
		if(!currentAuth){
			$scope.$emit("requiredAuth", "positive");
		}

		/*
			$scope.currentFunc ~ connect History service to scope
			$scope.idCollection ~ save the IDs of vote list
			$scope.optionCollection ~ save option list
			$scope.records ~ save votes the user has voted
			$scope.vote ~ connect firebase reference of vote to scope
		*/
		$scope.currentFunc = History;
		$scope.idCollection = [];
		$scope.optionCollection = [];
		$scope.records = [];
		$scope.vote = Vote.ref;

		//first load history data in firebase
		//once finish loading, retrieve specific vote details corrsponding to each history record
		$scope.currentFunc.all($scope.authData.uid).$loaded(function(data){
			angular.forEach(data, function(data){
				$scope.idCollection.push(data.id);
				$scope.optionCollection.push(data.option);
			});
		}).then(function(){
			for(var i = 0; i < $scope.idCollection.length; i++){
				$scope.vote.child($scope.idCollection[i]).once("value", function(snapshot){
					var data = snapshot.val();
					var optionIndex = $scope.optionCollection[i];
					$scope.records.push({
						id: $scope.idCollection[i], 
						title: data.title, 
						date: data.date, 
						option: data.options[optionIndex].content
					});
				});
			}
		});

	}]);

	//define controller for create view
	app.controller('createCtrl', ['$scope', 'currentAuth', 'Vote', '$location', function($scope, currentAuth, Vote, $location){

		if(!currentAuth){
			$scope.$emit("requiredAuth", "positive");
		}

		//clear all the inputs
		$scope.clear = function(){
			$scope.title = "";
			$scope.option1 = "";
			$scope.option2 = "";
			$scope.option3 = "";
		}

		//create method for create btn
		//once all the inputs are filled
		//add new vote to firebase and navigate to list view
		$scope.create = function(){
			if(!($scope.title && $scope.option1 && $scope.option2 && $scope.option3)){
				$scope.error = "Please Fill Out All the Blanks.";
				return false;
			}
			var newVote = {
				creater: $scope.authData.uid,
				title: $scope.title,
				options: [
					{
						content: $scope.option1,
						rate: 0
					},
					{
						content: $scope.option2,
						rate: 0
					},
					{
						content: $scope.option3,
						rate: 0
					}
				],
				date: new Date().getTime()
			};

			$scope.vote.add(newVote).then(function(ref){
				var id = ref.key();
				console.log("new vote added, id: " + id);
				$location.path("/list");
			});
		}

		//connect Vote service to scope
		$scope.vote = Vote;
		
	}]);

})();