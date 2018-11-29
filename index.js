const express = require('express')
const app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = 3000
const bodyParser = require('body-parser');
const util = require('util');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);
const uuid = require('uuid/v4')

var inUse = false;
const cleanUpTime = 300000;
const compile_directory = "temp_compile";

app.use(bodyParser.json());
app.use(express.static('app'))
app.use(express.static('node_modules'))
app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
    cleanUpTempFolder(compile_directory);
})

app.post('/submitCode', (req,res) => {
    console.log(req.body);
    inUse = true;
    var response = {
        status: "ERR",
        output: "",
        error: ""
    }

    const code_id = `code-${uuid()}`;
    console.log(`code_id: ${code_id}`);
    fs.writeFile(`${compile_directory}/${code_id}.cpp`,req.body.code, async function(err){
        if(err){
            res.type('json')
            res.send(response);
            inUse = false;
        }
        else{
            const { stdout, stderr } = await exec(`g++ ${compile_directory}/${code_id}.cpp -o ${compile_directory}/${code_id}.out --std=c++17\
            && echo "${req.body.input}" | ./${compile_directory}/${code_id}.out`).catch((err) => {
                if(err != undefined){
                    console.log('am I right now?')
                    console.log(err);
                    console.log(err.stderr)
                    return { stdout: null, stderr: err.stderr };
                }
                return {stdout: null, stderr: null};
            });
            console.log('stdout:', stdout);
            console.log('stderr:', stderr);
            if(stderr == null || stderr == ""){
                response = {
                    status: "OK",
                    output: stdout,
                    error: stderr
                }
            }
            else{
                response = {
                    status: "ERR",
                    output: stdout,
                    error: stderr
                }
            }
            res.type('json')
            res.send(response);
            inUse = false;
        }
    })
})

async function cleanUpTempFolder(folder){
    if(!inUse){
        console.log('Directory clean up initiated for dir ' + folder);
        const {stdout, stderr} = await exec(`rm -rvf ${folder}/*.{cpp,out}`)
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    }
    setTimeout(cleanUpTempFolder,cleanUpTime,"temp_compile");
}

io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
      });
  });