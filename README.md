FrameBudget.js
==============
To have smooth desktop webexperince.

You have about 1000/60 = 16.667ms Frame Budget.

For mobile it could be 6~7 times slower.
http://www.html5rocks.com/en/tutorials/speed/rendering/

Sometimes user interatction events happen, you need to do work besies webgl/2dcanvas render calls, you can sometimes bust the framerate and create jank.


### Vanilla Annotated Source - Docs
http://wonglok.github.io/FrameBudget.js/frameBudget.html

### Example
http://wonglok.github.io/FrameBudget.js/example.html
This example shows that


### Approach
- [x] breakdown big compute into chunks of tasks
- [x] run them within render loop within FRAME_BUDGET


### Init Option

*Simple Mode*
```js
// uses default 5ms budget
var tmRAF = new FrameBudgetTaskManager();
//overide 5ms default
tmRAF.setFrameBudget(6);
```

*Auto Estimate Frame Budget + Renderer Hook Mode*
```js
// uses default 5ms budget
var tmRAF = new FrameBudgetTaskManager(
  //if set yes, then show first 100 frame (rAFindex < n)
  //noDebug: true,  //optional.
  renderer: {
    fn: function render(){ console.log('draw') },
    //ctx: null, //optional
    //args: null, //optional
  }
});
```

### Add Task Option



Simple
```js
for (var i =0 ; i< myCustomObj.data.length; i++){
	tmRAF.addTask({
	    ctx: myCustomObj,
	    args: [ i ],
	    process: myCustomObj.tinyTask,
	});
}
```


Skip trigger Add Task
```js

for (var i =0 ; i< myCustomObj.data.length; i++){
  tmRAF.addTask({
      ctx: myCustomObj,
      data: i,
      process: myCustomObj.tinyTask,

        // skipAutoStart: true,
          // disable the startloop trigger
          // ***neeeds to call 'Digest' to run all waited tasks.
          // *** it will not wait when renderer hook is enabled.

  });
}
tmRAF.digest();
```

Shared Data, Functions for above examples ....
```js

function fib(n) {
  return n < 2 ? 1 : fib(n - 1) + fib(n - 2);
}

var myCustomObj = {
    data: [],
    before: function(){

    },
    tinyTask: function (i){
        this.before();

        var val = this.data[i];
        var result = fib(val);

        //console.log(result);
        this.bucket[i] = result;


        this.finish();

    },
    finish: function(){
    	//check end
        if (this.bucket.length === this.data.length){
            this.myCustomCallback();
        }else{
            console.log(this.data.length - this.bucket.length);
        }
    },
    bucket: [],
    myCustomCallback: function(){
        console.log(this);
    },
};

//populate data
for (var i =0 ; i< 30; i++){
    myCustomObj.data[i] = 30-i;
}
```

### App-Flow (Simple Mode)
0. Config manager with Simple mode
1. addTask method call
2. auto trigger start rAF loop (if task is set to wait then skip the trigger)
   @each frame
3. module run hooked renderer if there is
4. do {} while () the task stack within frame budget `DEFAULT_FRAME_BUDGET = 5ms`
5. stop rAF loop if all tasks done & not using renderer hook

### App-Flow (Renderer Hook Mode)
1. Config manager with renderer hook enabled mode
2. addTask calls
3. System adapt all addTask calls into a waiting stack.
4. System detect frame budget by sampling rAF time using perfomrance.now()
5. `Dynamic frame budget generated to adapt different mobile devices`
6. When estimation completes, system run all scheduled addTask calls then any digest calls.

7. Change mode back to simple mode after estimation with a new estimated frame budget.
8. receive AddTask calls -> trigger startLoop ....
9. Same as Simple Mode....




# ToDo:
-  Rewrite into testable code when this paradigm is acutally usfeul.
