//PolyFill
//--------------
/*
@license
Credit: MDN (Mozilla Developer Network)
*/
;if(!Array.prototype.filter){Array.prototype.filter=function(e){"use strict";if(this===void 0||this===null)throw new TypeError;var t=Object(this);var n=t.length>>>0;if(typeof e!="function")throw new TypeError;var r=[];var i=arguments.length>=2?arguments[1]:void 0;for(var s=0;s<n;s++){if(s in t){var o=t[s];if(e.call(i,o,s,t))r.push(o)}}return r}}
/*
@license
Fill console for older browsers
Credit: HTML5 Boilerplat
*/
;(function(){var e;var t=function(){};var n=["assert","clear","count","debug","dir","dirxml","error","exception","group","groupCollapsed","groupEnd","info","log","markTimeline","profile","profileEnd","table","time","timeEnd","timeStamp","trace","warn"];var r=n.length;var i=window.console=window.console||{};while(r--){e=n[r];if(!i[e]){i[e]=t}}})()
/*
@license
http://paulirish.com/2011/requestanimationframe-for-smart-animating/
http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
MIT license
*/

;(function(){var e=0;var t=["ms","moz","webkit","o"];for(var n=0;n<t.length&&!window.requestAnimationFrame;++n){window.requestAnimationFrame=window[t[n]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[t[n]+"CancelAnimationFrame"]||window[t[n]+"CancelRequestAnimationFrame"]}if(!window.requestAnimationFrame)window.requestAnimationFrame=function(t,n){var r=(new Date).getTime();var i=Math.max(0,16-(r-e));var s=window.setTimeout(function(){t(r+i)},i);e=r+i;return s};if(!window.cancelAnimationFrame)window.cancelAnimationFrame=function(e){clearTimeout(e)}})();


//Frame Budget Task Mangaer
//--------------


//---------------------
/*
Author: WONG LOK
Github: wonglok
NOTE: Experiment only.
License: Apache v2
*/
//---------------------
;(function(window){
    "use strict";

    function FrameBudgetMGR(){
        var self = this,
            IS_STRICT_MODE = (function() { return !this; })(),

            //Task Stack
            //--------------
            LOOP_STARTED = false,
            TASK_STACK = [],
            RAF_INDEX = 0,

            //Hook of Renderer
            //--------------
            USE_RENDERER = false,
            NOOP = function NOOP(){},
            RENDERER = {
                ctx : null,
                fn: NOOP,
                args: [],
            },

            //Frame Budget
            //--------------
            USE_FRAME_BUDGET_ESTIMATOR = false,
            //`FRAME_BUDGET` will be overwritten by budget estimator
            FRAME_BUDGET_DEFAULT = 5,
            FRAME_BUDGET = parseInt(FRAME_BUDGET_DEFAULT,10),
            FRAME_BUDGET_SAMPLE_AMOUNT = 15,
            //each time `2` `FRAME_BUDGET_SAMPLE_AMOUNT` will be used to get rid of th max, and min error val
            FRAME_BUDGET_SAMPLE_FILTER_PASS = 2,
            //`FRAME_BUDGET_TIGHTEN_FACTOR`is only valid  when using estimator
            FRAME_BUDGET_TIGHTEN_FACTOR = 0.85,
            //`LOOP_IS_READY` will become true after the budget estimation.
            LOOP_IS_READY = false,
            //`PRE_INIT_CALL_STACK` stores premature calls to the module. and fire it after budget estimation.
            PRE_INIT_CALL_STACK = {
                addTask: null,
                digest: null,
            },

            DEBUG_ENABLED = true;



        //Is only callable when not using estimator
        function setFrameBudget(timeLimit){
            if (timeLimit){
                if (USE_FRAME_BUDGET_ESTIMATOR){
                    console.log('You are using estimator');
                }else{
                    if (timeLimit > 1000/60){
                        console.warn('***** You are might be specifying too much frame budget: ' +timeLimit+ 'ms');
                        timeLimit = 1000/60;
                    }
                    FRAME_BUDGET = timeLimit;
                }
            }
        }

        //Frame Budget Estimation
        //--------------
        function estimateFrameBudget(){
            var start,
                end,
                frameBudgetSamples = [],//Statistics Samples
                estimatedResult;

            function calcAvg(array){
                var sum = 0;
                for(var i = 0; i < array.length; i++){
                    sum = sum + array[i];
                }
                return sum/array.length;
            }

            /*!
            fast max min
            http://ejohn.org/blog/fast-javascript-maxmin/
            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
            !*/
            function getMaxFromArr( array ){
                return Math.max.apply( null, array );
            }

            function getMinFromArr( array ){
                return Math.min.apply( null, array );
            }

            function cutMaxMin(item,index,array){
                return (
                    true
                    &&  item < getMaxFromArr(array)
                    &&  item > getMinFromArr(array)
                );
            }

            function removeError(sampleData,pass){
                for (var i =0 ; i <= pass; i++){
                    sampleData = sampleData.filter(cutMaxMin);
                }

                return sampleData;
            }

            function calcBudgetFromStat(){
                var average = calcAvg(frameBudgetSamples);

                frameBudgetSamples = removeError(frameBudgetSamples,FRAME_BUDGET_SAMPLE_FILTER_PASS);

                if (DEBUG_ENABLED){
                    console.info(frameBudgetSamples);
                }

                return average;
            }


            function takeFrameBudgetSamples(){
                start = window.performance.now();
                requestAnimationFrame(function(){
                    end = window.performance.now();
                    frameBudgetSamples.push(end-start);
                    if (frameBudgetSamples.length <= FRAME_BUDGET_SAMPLE_AMOUNT){
                        requestAnimationFrame(takeFrameBudgetSamples);
                    }else{
                        var frameBudget = calcBudgetFromStat();
                        finishEstimation(frameBudget);
                    }
                });
            }

            function finishEstimation(frameBudget){
                LOOP_IS_READY = true;
                FRAME_BUDGET = frameBudget*FRAME_BUDGET_TIGHTEN_FACTOR;

                if (DEBUG_ENABLED){
                    console.debug(FRAME_BUDGET);
                }

                finishAllCalls();
            }

            //start sampling when the this is being called
            takeFrameBudgetSamples();

        }


        //Benchmarking & Debugging
        //--------------
        function toggleDebug(){
            DEBUG.ENABLED = !DEBUG.ENABLED;
        }
        var frameStartLog = {};
        var frameEndLog = {};
        var debugLimit = 100;
        function benchInit(){
            if (DEBUG_ENABLED && RAF_INDEX < debugLimit){
                frameStartLog['i'] = RAF_INDEX;
                frameStartLog['frame'] = 'Start';
                frameStartLog['budget'] = FRAME_BUDGET;
                console.log(frameStartLog);
            }
            return 0;
        }
        function benchLoop(numTskDone){
            if (DEBUG_ENABLED){
                numTskDone++;
            }
            return numTskDone;
        }
        function benchFinish(numTskDone){
            if (DEBUG_ENABLED && RAF_INDEX < debugLimit) {
                frameEndLog['i'] = RAF_INDEX;
                frameEndLog['frame'] = 'Ended';
                frameEndLog['renderer'] = USE_RENDERER;
                frameEndLog['taskDone'] = numTskDone;
                console.log(frameEndLog);
            }
        }

        //Process Tasks
        //--------------
        function getTask(){
            return TASK_STACK.shift();
        }

        function checkIsTask(task){
            return (
                   typeof task !== 'undefined'
                && typeof task.process === 'function'
            );
        }

        function applyTaskFn(task){
            if (typeof task.args !== 'undefined'){
                task.process.apply(
                    task.ctx,
                    task.args
                )
            }else{
                task.process.call(
                    task.ctx,
                    task.data
                );
            }
        }


        //Loop Control Flow
        //--------------
        function stepper(){
            var frameStartTime = window.performance.now(),
                benchmark = benchInit(),
                task,
                isTask;

            if (USE_RENDERER){
                RENDERER.fn.apply(RENDERER.ctx,RENDERER.args);
            }

            do {
                task = getTask(),
                isTask = checkIsTask(task);
                if (isTask) {
                    applyTaskFn(task);
                    benchmark = benchLoop(benchmark);
                }
            } while (
                    (window.performance.now() - frameStartTime) < FRAME_BUDGET
                &&  TASK_STACK.length > 0
            )
            benchFinish(benchmark);

            triggerStopLoop();

        }

        //Loop
        //--------------
        function requestFrame(frameFn){
            RAF_INDEX = requestAnimationFrame(frameFn);
        }

        function loop(){
            requestFrame(loop);
            stepper();
        }

        function startLoop(){
            requestFrame(loop);
            if (DEBUG_ENABLED){
                console.info('~~RAF Loop Started');
            }
        }

        function stopLoop(){
            LOOP_STARTED = false;
            //`cancelAnimationFrame` break the loop
            cancelAnimationFrame(RAF_INDEX);
            if (DEBUG_ENABLED){
                console.info('**RAF Loop Stopped');
            }
        }

        //Loop Trigger
        //--------------
        function triggerStartLoop(){
            if (!LOOP_STARTED){
                LOOP_STARTED = true;
                startLoop();
            }
        }
        function triggerStopLoop(){
            if (
                    TASK_STACK.length === 0
                && !USE_RENDERER
            ){
                stopLoop();
            }
        }

        //Task scheduler
        //--------------
        function addTask( task ){
            TASK_STACK.push( task );
            //if wait then skip try start loop
            if (!!task.wait){ return; }
            triggerStartLoop();
        }

        //if task.wait = true,
        //needs to digest after scheduling
        function digest(){
            if (TASK_STACK.length>0){
                triggerStartLoop();
            }
        }


        //Set Renderer function
        //--------------
        function setRenderer(opt){
            if (typeof opt !== 'undefined'){
                if (typeof opt.fn === 'function'){
                    RENDERER.fn = opt.fn;
                    USE_RENDERER = true;
                }
                if (typeof opt.ctx !== 'undefined'){
                    RENDERER.ctx = opt.ctx;
                }
                if (typeof opt.args !== 'undefined'){
                    RENDERER.args = opt.args;
                }
            }
        }

        //Delayed init adpaters
        //--------------
        function finishStackCalls(stack,fn){
            var calls = PRE_INIT_CALL_STACK[stack];
            if (calls){
                for (var i = 0; i < calls.length; i++ ) {
                    fn.apply(this,calls[i]);
                }
            }
            PRE_INIT_CALL_STACK[stack] = null;
        }
        function finishAllCalls(){
            finishStackCalls('addTask',addTask);
            finishStackCalls('digest',digest);
        }
        function adaptCalls(stack,fn,args){
            if ( !LOOP_IS_READY ){
                if (!PRE_INIT_CALL_STACK[stack]){
                    PRE_INIT_CALL_STACK[stack] = [];
                }
                PRE_INIT_CALL_STACK[stack].push(args);
            } else {
                fn.apply(this,args);
            }
        }
        function addTaskCallReceiver(){
            adaptCalls('addTask',addTask, arguments);
        }
        function digestCallReceiver(){
            adaptCalls('digest',digest, arguments);
        }

        //Configure init
        //--------------
        function init(args){
            var opt = args[0];
            if (typeof opt === 'undefined'){
            }else{

                if (typeof opt.renderer !== 'undefined'){
                    setRenderer(opt.renderer);
                    USE_FRAME_BUDGET_ESTIMATOR = true;
                }

                if (typeof opt.noDebug !== 'undefined' && opt.noDebug === false){
                    DEBUG_ENABLED = false;
                }

            }

            if (USE_FRAME_BUDGET_ESTIMATOR){
                LOOP_IS_READY = false;
                estimateFrameBudget();
            }else{
                LOOP_IS_READY = true;
            }
        }
        //augment constructor argument into init func
        init(arguments);

        //declare public api

        self.addTask = addTaskCallReceiver;
        self.digest = digestCallReceiver;

        self.toggleDebug = toggleDebug;
        self.setFrameBudget = setFrameBudget;

        //return the reference of this object
        return this;
    }

    window.FrameBudgetTaskManager = FrameBudgetMGR;
})(this);


// Usage
// ----------------


// not a part of library,
//
// just for showing how to use this library

//
//---------------------
//             // use case 1
//             // uses default 5ms budget
//             tmRAF = new tmRAF();


//---------------------
//             // use case 2
//             // specify budget wtih 2ms
//             tmRAF = new tmRAF();
//             tmRAF.setFrameBudget(10);


//---------------------
//             // use case 3
//             // manager will estimate frame then use the renderer
//             // let the frame budget manager handle
//             // your renderer and async task
//             tmRAF = new tmRAF({
//                 //you dont need to specify frame budget
//                 //because the estimator will handle it.
//                 renderer: {
//                     fn: render,
//                     // ctx: renderCtx, //optinal
//                     //args: [] //optional
//                 }
//             });


//---------------------
//             // use case 4
//             // no debug
//             tmRAF = new tmRAF({
//                 noDebug: true,
//                 renderer: {
//                     fn: render,
//                     // ctx: renderCtx, //optinal
//                     //args: [] //optional
//                 }
//             });


//---------------------
//             // use case 5
//             // no debug during run time.
//             tmRAF = new tmRAF({
//                 renderer: {
//                     fn: render,
//                     // ctx: renderCtx, //optinal
//                     //args: [] //optional
//                 }
//             });
//             tmRAF.toggleDebug();
//             //heavy computing function. dont apply n above 40.
//             function fib(n) {
//             return n < 2 ? 1 : fib(n - 1) + fib(n - 2);
//             }


//---------------------
//             var myCustomObj = {
//                 data: [],
//                 before: function(){
//                 },
//                 tinyTask: function (i){
//                     this.before();
//                     var val = this.data[i];
//                     var result = fib(val);
//                     //console.log(result);
//                     this.bucket[i] = result;
//                     this.finish();
//                 },
//                 finish: function(){
//                     //check end
//                     if (this.bucket.length === this.data.length){
//                         this.callback();
//                     }else{
//                         console.log(this.data.length - this.bucket.length);
//                     }
//                 },
//                 bucket: [],
//                 callback: function(){
//                     console.log(this);
//                 },
//             };
//             //populate data
//             for (var i =0 ; i< 30; i++){
//                 myCustomObj.data[i] = 30-i;
//             }


//---------------------
//         function taskAdder(i, useCase){
//             if (useCase === 1){
//                 requestAnimationFrame(function(){
//                     tmRAF.addTask({
//                         ctx: myCustomObj,
//                         data: i,
//                         process: myCustomObj.tinyTask,
//                         // wait: true,
//                             // enable order of task adding
//                             // p.s. neeeds to call 'Digest' to run all waited tasks.
//                             // cannot use
//                     });
//                 });
//             }
//             if (useCase === 2){
//                 tmRAF.addTask({
//                     ctx: myCustomObj,
//                     args: [ i ],
//                     process: myCustomObj.tinyTask,
//                 });
//             }
//         }

//         for (var i =0 ; i< myCustomObj.data.length; i++){
//             taskAdder(i,1);
//         }
//         tmRAF.digest();

//---------------------