/*
    Trampoline Implementation - Uses few ideas from Adapton (http://dl.acm.org/citation.cfm?id=2594324) 
    Memoize thunks, maintain dependency graph and evaluates on demand. Does in order traversal of 
    dependencies and evaluates all dependent nodes for every change. 
    Tries to trampoline (http://raganwald.com/2013/03/28/trampolines-in-javascript.html) thunks to do 
    better tail calls evaluation.
 */
function isGenerator(fn) {
   return fn.constructor.name === 'GeneratorFunction';
}
var get_params = require('get-parameter-names');
var pretty = require('js-object-pretty-print').pretty;
class Partial {
    constructor(func,args) {
        console.log("start constructing Partial:" + func);
        if(!(func instanceof Function)){throw "the first argument must be callable";}
        this.func = func
        this.params = get_params(func)
        this.args = args
        console.log("end constructing Partial:" + func);
    }
    evaluate(fargs) {
        console.log("start evaluate Partial:" + this.func);
        var fparams = [];
        if(fargs) {
            for(var i = 0; i < fargs.length; i++) {
                fparams.append(fargs[i]);
            }
        }
        this.params.forEach(function(item, index){
            if(fparams[index] && args[item]){
                var sub = fparams.slice(index);
                fparams[index] = args[item];
                fparams = fparams.concat(sub);
            }
            else if(args[item]){
                fparams[index] = args[item];
            }
        });
        console.log("stop evaluate Partial:" + this.func);
        console.log(this.func instanceof Function);
        return this.func.apply(this,fparams);
    }
}
var hash = require('object-hash');
var deepEqual = require('deep-equal');
class Memo extends Partial {
    constructor(fn, args) {
        console.log("start constructing Memo:" + fn);
        if(fn instanceof Memo && !args){return fn;}
        super(fn,args);
        args = [];
        fn = this;
        while (true) {
            if (fn instanceof Partial) {
                if(fn.args) {
                    args = args.concat(fn.args.slice().reverse());
                }
                fn = fn.func;
            }
            else if (fn instanceof Trampolining) {
                fn = fn.fn;
            }
            else {
                break;
            }
        }
        if (!args) {
            this.hash = null;
            return this;
        }
        this.signature = { fn: fn, args: args };
        this.hash = hash(this.signature);
        console.log("stop constructing Memo:" + fn);
    }
    hash() {
        return this.hash;
    }
    equal(other) {
        return fn instanceof Memo && 
                this.hash != null && other.hash != null && this.hash === other.hash && 
                deepEqual(this.signature,other.signature);
    }
}
class Ycall extends Partial {
    /*Wrap a function to be called by the caller's trampoline.*/
    constructor(fn, args) {
        console.log("constructing Ycall:" + fn);
        if (fn instanceof Trampolining) {
            return fn.ycall(args);
        }
        else {
            console.log("constructing Ycall: Non Trampolining");
            return super(fn, args);
        }
    }
}
class Ytailcall extends Partial {
    /*Wrap a function to be tail-called by the caller's trampoline (discarding the caller's frame).*/
    constructor(fn, args) {
        console.log("constructing Ytailcall:" + fn);
        if (fn instanceof Trampolining) {
            return fn.ytailcall(args);
        }
        else {
            console.log("constructing Ytailcall: Non Trampolining" + fn);
            return super(fn, args);
        }
    }
}
class Trampolining {
    constructor(fn) {
        console.log("start constructing Trampolining:" + fn);
        this.fn = fn;
        console.log("stop constructing Trampolining:" + fn);
    }
    evaluate(args) {
        console.log("start evaluate Trampolining:" + this.fn);
        var fn = this.fn.next().value;
        console.log(fn);
        var value;
        stack = []
        while (true) {
            while(fn instanceof Ycall || fn instanceof Ytailcall){
                fn = fn.evaluate();
            }
            if(isGenerator(fn)) {
                value = null;
            }
            else {
                if(!(stack && stack.length)) {
                    return fn;
                }
                value = fn;
                fn = stack.pop();
            }
            while (true) {
                value = fn.send(value);
                if(value instanceof Ycall) {
                    stack.append(fn);
                    fn = value;
                    break;
                }
                else if(value instanceof Ytailcall) {
                    fn = value;
                    break;
                }
                if(!(stack && stack.length)) {
                    return value;
                }
                fn = stack.pop();
            }
        }
        console.log("stop evaluate Trampolining:" + this.fn);
    }
    ycall(args) {
        console.log("start ycall Trampolining:" + this.fn);
        return Ycall(this.fn, args);
        console.log("stop ycall Trampolining:" + this.fn);
    }
    ytailcall(args) {
        console.log("start ytailcall Trampolining:" + this.fn);
        return Ytailcall(this.fn, args);
        console.log("stop ytailcall Trampolining:" + this.fn);
    }
    toString() {
        return "Trampolining ({0})".format(this.fn);
    }
}

stack = [];
memo_table = {};
uninitialized = "uninitialized";
None = "None";

class Dependency {
    constructor(node, value) {
        console.log("start constructing Dependency:" + node);
        this.node = node;
        this.value = value;
        console.log("start constructing Dependency:" + node);
    }
}

class Lazy {
    constructor(fn, args) {
        console.log("start constructing Lazy:" + fn);
        if (fn instanceof Function) {
            var thunk = new Memo(fn, args)
            if (thunk in memo_table) {
                return memo_table[thunk];
            }
            else {
                this.thunk = thunk;
                this.value = uninitialized;
                memo_table[thunk] = this;
            }
        }
        else {
            this.thunk = None;
            this.value = fn;
        }
        this.binders = [];
        this.dependencies = None;
        console.log("stop constructing Lazy:" + fn);
        return this;
    }
    notify(result) {
        console.log("start notify Lazy:" + result);
        if (this.binders) {
            for (fn in this.binders) {
                fn(result);
            }
            this.binders = [];
        }
        console.log("stop notify Lazy:" + result);
    }
    is_forced() {
        console.log("is_forced Lazy:");
        return (this.dependencies.length == 0 && this.value != uninitialized);
    }
    update(fn) {
        console.log("start update Lazy:" + fn);
        memo_table.delete(this.thunk);
        if (fn instanceof Function) {
            this.thunk = Memo(fn);
        }
        else {
            this.thunk = None;
            this.value = fn;
        }
        this.dependencies = None;
        console.log("stop update Lazy:" + fn);
    }
    bind(fn) {
        console.log("start bind Lazy:" + fn);
        if (this.is_forced()) {
            fn(this.value);
        }
        else {
            this.binders.append(fn);
        }
        console.log("stop bind Lazy:" + fn);
    }
    unbind(fn) {
        console.log("start unbind Lazy:" + fn);
        this.binders.remove(fn);
        console.log("stop unbind Lazy:" + fn);
    }
    yforce() {
        console.log("yforce");
        return Ycall(this.force);
    }
    ytailforce() {
        console.log("ytailforce");
        return Ytailcall(this.force);
    }
    toString() {
        if (this.is_forced()) {
            return "({0},{1})".format(this.thunk,this.value);
        }
        else if (this.thunk) {
            return "({0})".format(this.thunk);
        }
        else {
            return "({0})".format(this.value);
        }
    }
    * _evaluate() {
        console.log("start _evaluate Lazy:");
        stack.append(this);
        this.dependencies = [];
        this.value = uninitialized;
        box = [];
        this.bind(box.append);
        this.notify(yield Ycall(this.thunk));
        this.value = box[0];
        stack.pop();
        yield this.value;
    }
    evaluate() {
        console.log("start evaluate Lazy:");
        return new Trampolining(this._evaluate()).evaluate();
    }
    * _repair() {
        console.log("start _repair Lazy:");
        if (this.dependencies == None) {
            yield Ytailcall(this.evaluate);
        }
        visited = new Set();
        stack = [];
        node = this;
        dependencies = this.dependencies.slice().reverse();
        while (stack || dependencies) {
            if (dependencies) {
                stack.append([node, dependencies]);
                node = dependencies[-1].node;
                if (node in visited) {
                    dependencies = [];
                }
                else {
                    visited.add(node);
                    if (node.dependencies) {
                        dependencies = list(node.dependencies);
                    }
                    else {
                        dependencies = [];
                    }
                }
            }
            else {
                if (node.thunk && dependencies == None) {
                    yield Ycall(node.evaluate);
                }
                while (stack) {
                    node, dependencies = stack.pop();
                    dependency = dependencies.pop();
                    if (dependency.node.value == dependency.value) {
                        break;
                    }
                    yield Ycall(this.evaluate);
                    if (this == node) {
                        dependencies = None;
                    }
                }
            }
        }
        yield this.value;
    }
    repair() {
        console.log("start repair Lazy:" + pretty(this));
        return new Trampolining(this._repair()).evaluate(); 
    }
    * _force() {
        console.log("start _force Lazy:");
        var result;
        if (this.thunk) {
            result = yield new Ycall(this.repair);
        }
        else {
            result = this.value;
        }
        if (stack.length > 0) {
            var top = stack[-1];
            top.dependencies.append(Dependency(this, result));
        }
        yield result;
    }
    force() {
        console.log("start force Lazy:");
        return new Trampolining(this._force()).evaluate(); 
    }
}
x = new Lazy(5);
y = new Lazy(7);
z = new Lazy(function(){return x.force().next().value+y.force().next().value})
//console.log(x._force().next().value);
//console.log(x.force().next());
//console.log(y.force().next());
console.log(z.force());