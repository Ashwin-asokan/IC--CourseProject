/*
Scratch pad to try snippets. 
 */

function foo(bar, baz) {
  return bar + baz
}
 
var get = require('get-parameter-names')

var flyToTheMoon = function()
{
  alert("Zoom! Zoom! Zoom!");
}

var materials = [
  'Hydrogen',
  'Helium',
  'Lithium',
  'Beryllium'
];

var materialsLength2 = materials.map((material) => {
  return material.length;
}); //8,6,7,9

var x = 10

var y = 20

console.log(get(x));

var hash = require('object-hash');

console.log(hash(x));

console.log(hash({foo: 'bar'}));

class Dependency {
    constructor(node, value) {
        this.node = node;
        this.value = value;
    }
}

d = new Dependency("node","value");
console.log(d instanceof Dependency);

function* idMaker() {
    var index = 0;
    while(true)
        yield index++;
}

function isGenerator(fn) {
   return fn.constructor.name === 'GeneratorFunction' || fn instanceof Generator;
}

var sampleGenerator = function*() {};

function isGenerator(arg) {
    return arg.constructor === sampleGenerator.constructor;
}

var gen = idMaker(); // "Generator { }"

console.log(isGenerator(gen));

console.log(isGenerator(idMaker));
console.log(isGenerator(flyToTheMoon));

console.log(gen.next().value); // 0
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2

function* foo() {
  var index = 0;
  while (index <= 2)
    yield index++;
}

var iterator = foo();
console.log(iterator.next()); // { value: 1, done: false }
console.log(iterator.next()); // { value: 2, done: false }
console.log(iterator.next()); // { value: undefined, done: true }

var fruits = ["Banana", "Orange", "Apple", "Mango"];
console.log(fruits.reverse());
console.log(fruits);

function* generatorFoo() {
  yield 1;
  yield 2;
}

function* generatorBar() {
  // First Create the generator object by invoking the function
  // then yield it.
  yield* generatorFoo();
  yield 'I am bar!'
}
function print(fn){
  console.log(isGenerator(fn));
  console.log(fn instanceof Function);
  console.log(fn.next().value); // Prints 1
}

var generator = generatorBar(); 

print(generator);
print(generator);
var pretty = require('js-object-pretty-print').pretty;
console.log(pretty(fruits));

var a = [34, 203, 3, 746, 200, 984, 198, 764, 9];
 
function mergeSort(arr)
{
    if (arr.length < 2)
        return arr;
 
    var middle = parseInt(arr.length / 2);
    var left   = arr.slice(0, middle);
    var right  = arr.slice(middle, arr.length);
 
    return merge(mergeSort(left), mergeSort(right));
}
 
function merge(left, right)
{
    var result = [];
 
    while (left.length && right.length) {
        if (left[0] <= right[0]) {
            result.push(left.shift());
        } else {
            result.push(right.shift());
        }
    }
 
    while (left.length)
        result.push(left.shift());
 
    while (right.length)
        result.push(right.shift());
 
    return result;
}
 
console.log(mergeSort(a));


