/*
    A bit more faithful Implementation - Uses few ideas from Adapton (http://dl.acm.org/citation.cfm?id=2594324) 
    Memoize thunks, maintain dependency graph and evaluates on demand. Keep tracks of dependencies on 
    either side of edges, keep track of dirty flag & selectively traverse the graph. 
    Still being worked upon, doesn't work as expected. 
    Some problem in following dirty flag. looking into that.
 */
function isGenerator(fn) {
   return fn.constructor.name === 'GeneratorFunction';
}
var get_params = require('get-parameter-names')
var assert = require('assert');
class Partial {
    constructor(func,args) {
        if(!(func instanceof Function)){throw "the first argument must be callable";}
        this.func = func
        this.params = get_params(func)
        this.args = args
    }
    evaluate(fargs) {
        var fparams = [];
        if(fargs) {
            for(var i = 0; i < fargs.length; i++) {
                fparams.push(fargs[i]);
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
        return this.func.apply(this,fparams);
    }
    evaluate() {
        return this.func.apply(this);
    }
}
var hash = require('object-hash');
var deepEqual = require('deep-equal');
class Memo extends Partial {
    constructor(fn, args) {
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
            else {
                break;
            }
        }
        this.signature = { fn: fn, args: args };
        this.hash = hash(this.signature);
    }
    hash() {
        return this.hash;
    }
    equal(other) {
        return fn instanceof Memo && 
                this.hash != null && other.hash != null && this.hash === other.hash && 
                deepEqual(this.signature,other.signature);
    }
    evaluate() {
        return super.evaluate();
    }
    evaluate(fargs) {
        return super.evaluate(fargs);
    }
}

lazy_change_propagation_level = 0
stack = []
memo_table = {}
uninitialized = "uninitialized"
None = "None"

class Dependency {
    constructor(node, value, dirty = false) {
        this.node = node;
        this.value = value;
        this.dirty = dirty;
    }
}

class Lazy {
    constructor(fn, args) {
        if (fn instanceof Function) {
            var thunk = new Memo(fn, args)
                if (thunk.hash in memo_table) {
                    return memo_table[thunk];
                }
                else {
                    this.thunk = thunk;
                    this.value = uninitialized;
                    memo_table[thunk.hash] = this;
                }
        }
        else {
            this.thunk = null;
            this.value = fn;
        }
        this.binders = [];
        this.dependencies = [];
        this.dependents = {};
        return this;
    }
    evaluate() {
        stack.push(this);
        if (this.dependencies) {
            for (var dependency in this.dependencies) {
                var index = dependency.node.dependents.indexOf(this);
                if (index > -1) {
                    dependency.node.dependents = dependency.node.dependents.splice(index, 1);
                }
            }
        }
        this.dependencies = [];           
        this.value = this.thunk.evaluate();
        stack.pop();
        return this.value;
    }
    repair() {
        if (this.dependencies.length == 0) {
            this.evaluate();
        }
        var stack = [];
        var node = this;
        var dependencies = this.dependencies.slice().reverse();
        while (stack.length > 0 || dependencies.length > 0) {
            if (dependencies.length > 0) {
                var dependency = dependencies[dependencies.length-1];
                if (dependency.dirty) {
                    dependency.dirty = false;
                    stack.push({"node":node, "dependencies":dependencies});
                    node = dependency.node;
                    if (node.dependencies.length > 0) {
                            dependencies = [].push(node.dependencies);
                        }
                    else {
                        dependencies = [];
                    }
                }
                else {
                    dependencies.pop();
                }
            }
            else {
                if (node.thunk && dependencies.length == 0) {
                    return node.evaluate();
                }
                while (stack.length > 0) {
                    var element = stack.pop();
                    [node, dependencies] = [element["node"],element["dependencies"]];
                    var dependency = dependencies.pop();
                    if (dependency.node.value == dependency.value) {
                        break;
                    }
                    this.evaluate();
                    if (this == node) {
                        dependencies = [];
                    }
                }
            }
        }
        return this.value;
    }
    is_forced() {
        return (this.dependencies.length == 0 && this.value != uninitialized);
    }
    force() {
        var result;
        if (this.thunk) {
            result = this.repair();
        }
        else {
            result = this.value;
        }
        if (stack.length > 0) {
            var top = stack.pop();
            var dependency = new Dependency(this, result);
            top.dependencies.push(dependency);
            this.dependents[top] = dependency;
        }
        return result;
    }
    update(fn) {
        var dirty;
        if (this.thunk) {
            delete memo_table[this.thunk.hash];
        }
        if (fn instanceof Function) {
            this.thunk = new Memo(fn);
            dirty = true;
        }
        else {
            this.thunk = null;
            if(this.value != fn) {
                dirty = true;
            }
            this.value = fn;
        }
        if (this.dependencies.length > 0) {
            for (var dependency in this.dependencies) {
                var index = dependency.node.dependents.indexOf(this);
                if (index > -1) {
                    dependency.node.dependents = dependency.node.dependents.splice(index, 1);
                }
            }
        }
    }
    map_2_list(input) {
        var output = [], item;
        for (var key in input) {
            if (input.hasOwnProperty(key)) {
                item = {};
                item.key = key;
                item.value = input[key];
                output.push(item);
            }
        }
    }
}