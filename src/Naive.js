/*
    Naive Implementation - Uses few ideas from Adapton (http://dl.acm.org/citation.cfm?id=2594324) 
    Memoize thunks, maintain dependency graph and evaluates on demand. Does in order traversal of 
    dependencies and evaluates all dependent nodes for every change.
 */
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

stack = []
memo_table = {}
lazy_uninitialized = "lazy_uninitialized"
None = "None"

class Dependency {
    constructor(node, value) {
        this.node = node;
        this.value = value;
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
                this.value = lazy_uninitialized;
                memo_table[thunk.hash] = this;
            }
        }
        else {
            this.thunk = null;
            this.value = fn;
        }
        this.binders = [];
        this.dependencies = [];
        return this;
    }
    evaluate() {
        stack.push(this);
        this.dependencies = [];           
        this.value = this.thunk.evaluate();
        stack.pop();
        return this.value;
    }
    repair() {
        if (this.dependencies.length == 0) {
            this.evaluate();
        }
        var visited = new Set();
        var stack = [];
        var node = this;
        var dependencies = this.dependencies.slice().reverse();
        while (stack.length > 0 || dependencies.length > 0) {
            if (dependencies.length > 0) {
                stack.push([node, dependencies]);
                node = dependencies[dependencies.length-1].node;
                if (node in visited) {
                    dependencies = [];
                }
                else {
                    visited.add(node);
                    if (node.dependencies.length > 0) {
                        dependencies = [].push(node.dependencies);
                    }
                    else {
                        dependencies = [];
                    }
                }
            }
            else {
                if (node.thunk && dependencies.length == 0) {
                    return node.evaluate();
                }
                while (stack.length > 0) {
                    [node, dependencies] = stack.pop();
                    var dependency = dependencies.pop();
                    if (dependency.node.value == dependency.value) {
                        break;
                    }
                    return this.evaluate();
                }
            }
        }
        return this.value;
    }
    is_forced() {
        return (this.dependencies.length == 0 && this.value != lazy_uninitialized);
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
            top.dependencies.push(new Dependency(this, result));
            stack.push(top);
        }
        return result;
    }
    update(fn) {
        if (this.thunk) {
            delete memo_table[this.thunk.hash];
        }
        if (fn instanceof Function) {
            this.thunk = new Memo(fn);
        }
        else {
            this.thunk = null;
            this.value = fn;
        }
        this.dependencies = [];
    }
}
function test_5_plus_7() {
    x = new Lazy(5);
    y = new Lazy(7);
    z = new Lazy(function(){return x.force()+y.force()})
    assert.equal(z.force(), 12,"z should be 12 now");
    x.update(8)
    assert.equal(z.force(), 15,"z should be 15 now");
}
function test_42_div_1() {
    nom  = new Lazy(42);
    den  = new Lazy(1);
    div  = new Lazy( function(){return nom.force() / den.force()});
    root = new Lazy( function(){ if (den.force() == 0) { return 0; } else { return div.force(); } });
    assert.equal(root.force(), 42,"Root should be 42 now");
    den.update(0);
    assert.equal(root.force(), 0,"Root should be 0 now");
    den.update(1);
    assert.equal(root.force(), 42,"Root should be 42 now");
}
function test_simple() {
    x = new Lazy(1);
    y = new Lazy(function(){return x.force()});
    assert.equal(x.force(), 1,"x should be 1 now");
    assert.equal(y.force(), 1,"y should be 1 now");
    x.update(2);
    assert.equal(x.force(), 2,"x should be 2 now");
    assert.equal(y.force(), 2,"y should be 2 now");
}
function test_a_b_plus_c_update_a_b() {
    aa = new Lazy(1);
    bb = new Lazy(2);
    cc = new Lazy(3);
    dd = new Lazy(function(){return aa.force() * bb.force();});
    ee = new Lazy(function(){return dd.force() + cc.force();});
    assert.equal(ee.force(), 1 * 2 + 3,"ee should be 1 * 2 + 3 now");
    bb.update(4);
    assert.equal(ee.force(), 1 * 4 + 3,"ee should be 1 * 4 + 3 now");
    aa.update(5);
    assert.equal(ee.force(), 5 * 4 + 3,"ee should be 5 * 4 + 3 now");
}
function test_tree_sum_1_2_3_4_commute() {
    a = new Lazy(1);
    b = new Lazy(2);
    c = new Lazy(3);
    d = new Lazy(4);
    e = new Lazy(function(){return a.force() + b.force();})
    f = new Lazy(function(){return c.force() + d.force();})
    g = new Lazy(function(){return e.force() + f.force();})
    xsum = [1, 2, 3, 4].reduce(function(acc, val) { return acc + val;}, 0);
    assert.equal(g.force(), xsum,"g should be xsum now");
    e.update(function(){return b.force() + a.force();})
    g.update(function(){return f.force() + e.force();})
    assert.equal(g.force(), xsum,"g should be xsum now");
}
function test_square() {
    x = new Lazy(5);
    square = new Lazy(function(){return x.force() * x.force();});
    assert.equal(square.force(), 5 * 5,"square should be 5*5 now");
    x.update(6);
    assert.equal(square.force(), 6 * 6,"square should be 6*6 now");
}
test_5_plus_7();
test_42_div_1();
test_simple();
//test_a_b_plus_c_update_a_b();
test_tree_sum_1_2_3_4_commute();
var a = [new Lazy(34), new Lazy(203), new Lazy(3), new Lazy(746), new Lazy(200), new Lazy(984), 
new Lazy(198), new Lazy(764), new Lazy(9)];