# IC--CourseProject
CSCI 7000 Incremental computations - course project
Implement Adapton Ideas in Javascript.
All version, maintain memo table, lookup thunks and evaluates on demand.
1. Naive.js - Does in order traversal of dependencies and evaluates all dependent nodes for every change. - Needs more test cases. Particularly list operations and basic recursive functions.
2. BiDirectional.js - Maintain dirty flags, mark and re evaluate only the nodes being marked for change. - Work in Progress.
3. Tramboline.js - Tries to use generator yield pattern to optimize tail calls and evaluate thunks effectively. - Broken. Have some issues with handling generator functions and normal functions in 
a similar fashion. Have doubts about using class for the overall first class function flows at the
end. Gave up. Might look into this after comfortable with first two parts.

How to Run:
Install Node JS (https://nodejs.org/en/)
node Naive.js

Have few simple test cases working at the end of the file. Need to test the flow a bit closely. For now
does check for correctness. 
