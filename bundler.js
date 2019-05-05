
const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

// 文件分析函数
const moduleAnalyser = filename => {
  const content = fs.readFileSync(filename,'utf-8')
  const ast = parser.parse(content,{
    sourceType: "module"
  })
  const dependecies = {}
  traverse(ast, {
    ImportDeclaration({node}) {
      const dirname = path.dirname(filename)
      const newFile = './' + path.join(dirname,node.source.value)
      dependecies[node.source.value] = newFile
    }
  })
  const {code} = babel.transformFromAst(ast,null,{
    presets: ["@babel/preset-env"],
    // plugins: ["@babel/plugin-transform-modules-amd"]
  })
  return {
    filename,
    dependecies,
    code
  }
}


// 队列递归实现 Graph
const makeDependenciesGraph = entry => {
  const entryModule = moduleAnalyser(entry)

  const graphArr = [entryModule]
  for(let i = 0; i< graphArr.length ; i++) {
    const item = graphArr[i]
    const {dependecies} = item
    if(dependecies) {
      for(let j in dependecies) {
        graphArr.push(
          moduleAnalyser(dependecies[j])
        )
      }
    }
  }

  const graph = {}
  graphArr.forEach(item => {
    graph[item.filename] = {
      dependecies: item.dependecies,
      code: item.code
    }
  })
  // console.log(graph)
  return graph
}

// 浏览器里面执行
const generateCode = entry => {
  const graph = JSON.stringify(makeDependenciesGraph(entry))
  return `
  (function(graph){
    function require(module) {
      function localRequire(relativePath) {
        return require(graph[module].dependecies[relativePath])
      }
      var exports =  {}
      debugger
      (function(require,exports,code){
        eval(code)
      })(localRequire,exports,graph[module].code)
      return exports
    }
    require('${entry}')
  })(${graph})`
}

const code = generateCode('./src/index.js')
console.log(code)