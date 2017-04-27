angular.module('FBDataFetcherApp',[])

.run(['$rootScope', '$window', 'Auth', function($rootScope, $window, Auth) {
    $window.fbAsyncInit = function() {
       FB.init({
        appId:624118067736223,
        channelUrl: 'channel.html',
        status: true,
        cookie: true,
        xfbml: true,
        version: 'v2.4'
       });
       
       //Auth.fblogin();
    };
    (function(d){
        // load the Facebook javascript SDK

        var js, 
        id = 'facebook-jssdk', 
        ref = d.getElementsByTagName('script')[0];

        if (d.getElementById(id)) {
          return;
        }

        js = d.createElement('script'); 
        js.id = id; 
        js.async = true;
        js.src = "//connect.facebook.net/en_US/sdk.js";

        ref.parentNode.insertBefore(js, ref);

      }(document));  
  }])
  
 .factory('Auth', ['$rootScope', '$http', '$location', '$q', '$timeout',
    function($rootScope, $http, $location, $q, $timeout) {
      var srvAuth = {};
      var user = {};
      var authenticated = 0;
       srvAuth.fblogin = function(url) {
        var defer = $q.defer();
        FB.login(function (response) {
          if (response.status === 'connected') {
            FB.api('/me', function(res) {
              user.name = res.name;
              user.id = res.id;
              ////console.log(user);
              authenticated = 1;
              defer.resolve(user)
            });
          }
         },{scope:'user_managed_groups'});
        return defer.promise;
       }
      
      srvAuth.watchFBStatus = function() {
         FB.Event.subscribe('auth.authResponseChange', function(res) {
         //console.log(res);
          if (res.status === 'connected') {
            authenticated = 1;
            FB.api('/me', function(res) {
              user.name = res.name;
              user.id = res.id;
            });
          }
        });
      } 
      
      srvAuth.getGroups = function() {
       var defer = $q.defer();
        var groups = [];       
        FB.api('/' + user.id + '/groups', function(res) {
          //console.log(res);
          groups.length = 0;
          for(var i =0 ; i<res.data.length; i++) {
            var group = {name : res.data[i].name, id:res.data[i].id};
            //console.log(group);
            groups.push(res.data[i]);
          }
          //console.log("groups :: " + groups);
          defer.resolve(groups)
        });
         return defer.promise;
      }
      
      srvAuth.getUserName = function() {
        var defer = $q.defer();
        var interminateTimeInterval = 1;
        $timeout(function() {
          do {
            interminateTimeInterval++;
          } while(!srvAuth.isAuthenticated);
          defer.resolve(user);  
        }, Math.random() * interminateTimeInterval);
       
        return defer.promise;
      }
      
      srvAuth.getUserId = function() {
        return user.id;
      }
      
      srvAuth.isAuthenticated = function() {
        return Boolean (authenticated);
      }
      
      srvAuth.getGroupInfp = function(grpId, fromDate, toDate) {
      var defer = $q.defer();
        var groupInfos = [];
        var useDateFilter = 1;
         //console.log(fromDate);
        if(typeof fromDate == 'undefined' || typeof toDate == 'undefined') {
          //console.log("not using date filters");
          useDateFilter = 0;
         }
        //console.log(new Date(fromDate));
        //console.log(new Date(toDate));
        getFeeds(grpId).then(function(feeds) {
          for(var i =0; i<feeds.length; i++) {
           var groupInfo = {};
            //console.log(feeds[i]);
            if(!useDateFilter || (useDateFilter && (new Date(feeds[i].updated_time) >= new Date(fromDate) && new Date(feeds[i].updated_time) <= new Date(toDate)))) {
              groupInfo.id = feeds[i].id;
              var split = groupInfo.id.split("_",2);
              groupInfo.link = "https://facebook.com/groups/" + split[0] + "/permalink/" + split[1];
              //console.log(groupInfo.link);
              if(typeof feeds[i].message != 'undefined')
                groupInfo.message = feeds[i].message;
              else
                groupInfo.message = feeds[i].story;

              //console.log();
              //console.log(groupInfo);
              getLikes(groupInfo).then(function(groupInfo) {
                //console.log(groupInfo);
                  getComments(groupInfo).then(function(groupInfo){
                  //var groupInfo= {message : feeds[i].message, likesToPost: likes, commentsToPost : comments};
                  groupInfos.push(groupInfo);
                  defer.resolve(groupInfos);
                  //console.log("groupInfos :: " + groupInfos);
                });
              });
                         
            }
          }
          
        });
        
        return defer.promise;
      }
      
      getLikes = function(groupInfo) {
         var defer = $q.defer();
         //console.log(groupInfo);
         FB.api('/' + groupInfo.id+ '/likes', function(res) {
         //console.log(res);
         groupInfo.likes = res.data.length;
          defer.resolve(groupInfo);
         });
         return defer.promise; 
      }
      
      getComments = function(groupInfo) {
         var defer = $q.defer();
          FB.api('/' + groupInfo.id + '/comments', function(res) {
            //console.log(res.data.length);
             groupInfo.commentsToPost = res.data.length;
             defer.resolve(groupInfo);
          });
         return defer.promise;
      }
      
      getFeeds = function(grpId) {
        var defer = $q.defer();
          FB.api('/' + grpId + '/feed', function(res) {
            defer.resolve(res.data);
          });
         return defer.promise;
      }
   return srvAuth;
 }])
 
 .controller('DefaultCntrl', function($scope, Auth) {
  $scope.sortType     = 'message'; // set the default sort type
  $scope.sortReverse  = false;  // set the default sort order
  $scope.searchFish   = '';  
    Auth.getUserName().then(function(user) {
       //console.log("promise resolved : " + user);
       $scope.user_name = user.name
    });
    

   $scope.load = function() {
    ////console.log("log :: " +  );
     Auth.getGroups().then(function(grps){
    $scope.groups = grps;     
 });
  
   // //console.log($scope);
   };

   $scope.FBLogin = function() {
     Auth.watchFBStatus();
     //console.log(Auth.isAuthenticated());
     if(!Auth.isAuthenticated()) {
        Auth.fblogin().then(function(user){
          $scope.load();
          $scope.user_name = user.name;
        });
     }
     
     $scope.load();
   };
   
   $scope.selectedItemChanged = function() {
    //console.log("selected grp id :: " + $scope.selectedGrp);
    Auth.getGroupInfp($scope.selectedGrp, $scope.fromDate, $scope.toDate).then(function(groupInfos){
      //console.log("groupInfos from scope ::" + groupInfos);
      $scope.groupInfos = groupInfos;
    });
    
   };
   
  });