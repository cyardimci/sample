Todos = new Mongo.Collection('todos');
Lists = new Mongo.Collection('lists');

Router.configure({
  layoutTemplate: 'main',
  loadingTemplate:'loading'
});

Router.route("/register");
Router.route("/login");
Router.route("/", {
  name: 'home',
  template: 'home'
});
Router.route("/list/:_id", {
  name: 'listPage',
  template: 'listPage',
  data: function(){
      var currentList = this.params._id;
      var currentUser= Meteor.userId();
      return Lists.findOne({_id: currentList, createdBy: currentUser});
  },

  onBeforeAction: function(){
      var currentUser=Meteor.userId();
      if(currentUser){
        this.next;
      }else {
        this.render('login');
      }

  },

  waitOn: function(){
      var currentList=this.params._id;
      return Meteor.subscribe("todos",currentList);
  }
});

if(Meteor.isClient){



  $.validator.setDefaults({
    rules: {

        email: {
          required: true,
          email: true

        },
        password: {
            required: true,
            minlength: 8
        }

    },

    messages: {
        email: {
          required: "You must enter an email adress",
          email: "You have entered an invalid mail adress"
        },
        password: {
          required: "You must enter a password",
          minlength: "Your password must be at least {0} characters"
        }
    }

  });
  Template.todos.helpers({

      'todo': function(){
        var currentList= this._id;
        var currentUser=Meteor.userId();
        return Todos.find({listId: currentList, createdBy: currentUser},{sort: {createdAt: -1}});
      }

  });

  Template.todoItem.helpers({

     'checked':  function(){
       var isCompleted=this.completed;
       if(isCompleted){
         return "checked";
       }else{
         return "";
       }
     }

  });

  Template.addTodo.events({

    'submit form': function(event){
      event.preventDefault();
      var todoName = $("[name='todoName']").val();
      var currentList = this._id;
      Meteor.call('createListItem',todoName,currentList,function(error){

        if(error){
          console.log(error.reason)
        }else {
          $('[name="todoName"]').val("");
        }

      });



    },

  });

  Template.todosCount.helpers({
      'totalTodos': function(){
        var currentList=this._id;
        return Todos.find({listId: currentList}).count();
      },
      'completedTodos': function(){
        var currentList = this._id;
        return Todos.find({listId: currentList, completed: true}).count();
      }

  });

  Template.todoItem.events({
    'click .delete-todo': function(event){
      event.preventDefault();
      var documentId=this._id;
      var confirm= window.confirm("Delete this task?");
      if(confirm){
        Meteor.call('removeListItem',documentId);
        }
    },

    'keyup [name=todoItem]' : function(event){

      if(event.which == 13  || event.which == 27){

        $(event.target).blur();
      } else {
          var documentId = this._id;
          var todoItem = $(event.target).val();
          Meteor.call('updateListItem',documentId,todoItem);
        }
    },

    'change [type=checkbox]': function(){
          var documentId = this._id;
          var isCompleted = this.completed;

          if(isCompleted){

            Meteor.call('changeItemStatus',documentId,false);

          }else {

            Meteor.call('changeItemStatus',documentId,true);

          }

    }

  });

  Template.addList.events({
    'submit form': function(event){
      event.preventDefault();
      var listName = $("[name=listName]").val();
      Meteor.call('createNewList',listName, function(error,results){

        if(error){
          console.log(error.reason);
        }else {
          Router.go('listPage', {_id: results });
          $('[name="listName"]').val("");
        }
      });
    /*  var currentUser= Meteor.userId();
      Lists.insert({
        name: listName,
        createdBy: currentUser
      },function(error,results){

        Router.go('listPage',{_id: results});
      });
      $("[name=listName]").val(""); */

    }

  });

  Template.lists.helpers({

    'list': function(){
      var currentList=this._id;
      return Lists.find({listId: currentList},{sort: {name: 1}});
    }
  });

  Template.register.events({
    'submit form': function(event){

      event.preventDefault();



    }

  });

  Template.navigation.events({
    'click .logout': function(event){
        event.preventDefault();
        Meteor.logout();
        Router.go('login');
    }

  });

  Template.login.events({
    'submit form': function(event){
         event.preventDefault();



    }

  });

  Template.login.onCreated(function(){
      console.log("temp created");
  });
  Template.login.onRendered(function(){
    var validator =  $(".login").validate({
        submitHandler: function(event){
          var email=$("[name=email]").val();
          var password=$("[name=password]").val();
          Meteor.loginWithPassword(email,password,function(error){
            if (error){

              if(error.reason === "User not found"){
            validator.showErrors({
              email: error.reason
            });
            }
            if(error.reason==="Incorrect password"){

              validator.showErrors({
                password:error.reason
              });
            }
          }else{

            var currentRoute= Router.current().route.getName();
            if(currentRoute === 'login'){
            Router.go('home');
          }
          }
        });
        }
      });
  });
  Template.login.onDestroyed(function(){
      console.log("temp destroyed");
  });

  Template.register.onRendered(function(){
      var validator = $(".register").validate({
        submitHandler: function(event){


                var email= $("[name=email]").val();
                var password= $("[name=password]").val();
                Accounts.createUser({
                  email: email,
                  password: password

                },function(error){
                  if(error){
                  if(error.reason === "Email already exists."){

                    validator.showErrors({
                      email: "That email already belong to a registered user"
                    });
                  }
                }else {
                  Router.go('home');
                }
              });

        }

      });

  });

  Template.lists.onCreated(function(){

    this.subscribe('lists');
  });
}


if(Meteor.isServer){

  Meteor.publish('lists',function(){
    var currentUser = this.userId;
    return Lists.find({createdBy: currentUser});
  });

  Meteor.publish('todos',function(currentList){
    var currentUser= this.userId;
    return Todos.find({createdBy: currentUser, listId: currentList});

  });

  function defaultName(currentUser){

    var nextLetter='A';
    var nextName='List' + nextLetter;
    while(Lists.findOne({name: nextName, createdBy: currentUser})){

      nextLetter=String.fromCharCode(nextLetter.charCodeAt(0)+1);
      nextName='List'+nextLetter;
    }
    return nextName;


  }

  Meteor.methods({
    'createNewList': function(listName){

        var currentUser = Meteor.userId();

        check(listName, String);
        if(listName===""){
          listName=defaultName(currentUser);
        }
        var data= {
            name: listName,
            createdBy: currentUser
        }
        if(!currentUser){
          throw new Meteor.Error("not logged in","You are not logged in");
        }
       return  Lists.insert(data);

    },

    'createListItem': function(todoName,currentList){

      check(todoName,String);
      check(currentList,String);
      var currentUser= Meteor.userId();
      var data = {
        name: todoName,
        completed: false,
        createdAt: new Date(),
        createdBy: userId,
        listId: currentList
      }
      if(!currentUser){
        throw new Meteor.Error("not logged-in","Not loggedin");
      }
      var currentList=Lists.findOne(currentList);
      if(currentList.createdBy != currentUser){
        throw new Meteor.Error("invalid-user","You don't own that list");
      }




      return Todos.insert(data);
    },

    'updateListItem' : function(documentId,todoItem){
      check(todoItem,String);
      var currentUser = Meteor.userId();
      var data={
          _id: documentId,
          creeatedBy:currentUser
      }
      if(!currentUser){

        throw new Meteor.Error("not-logged-in","Yoou are not logged in");
      }
      Todos.update(data, {$set: {name: todoItem}});
    },

    'changeItemStatus': function(documentId,status){
      check(status,Boolean);
      var currentUser= Meteor.userId();
      var data={
        _id:documentId,
        createdBy: currentUser
      }
      if(!currentUser){
        throw new Meteor.Error("not-logged-in", "You are not logged in");
      }
      Todos.update(data, {$set: {completed: status}});
    },
    'removeListItem': function(documentId){
      var currentUser= Meteor.userId();
      var data={
        _id:documentId,
        createdBy: currentUser
      }
      if(!currentUser){
        throw new Meteor.Error("not-logged-in","You are not logged in");
      }
      Todos.remove(data);
    }

  });

}
