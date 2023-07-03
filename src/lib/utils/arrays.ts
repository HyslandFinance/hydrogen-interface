// given an array and a mapper function (value => key)
// returns it as a dictionary
// in case two elements map to the same key, keep the first element in array
export function arrayToDict(arr:any[], mapper:Function=(x:any)=>x) {
  let dict:any = {}
  for(let i = 0; i < arr.length; ++i) {
    let ele = arr[i]
    let key = mapper(ele)
    if(!dict.hasOwnProperty(key)) dict[key] = ele
  }
  return dict
}

// given an array that potentially contains duplicate elements
// returns a new array with only one copy of each unique element
// use mapper when elements are complex objects that should not be used as dictionary keys
// in case two elements map to the same key, keep the first element in array
export function deduplicateArray(arr:any[], mapper:Function=(x:any)=>x) {
  return Object.values(arrayToDict(arr, mapper))
}

// the default array.filter() returns a new array with the elements that pass the filter
// this function returns two arrays - one will the elements that pass, one with those that dont
// todo: attach to array prototype
export function filterYN(f:Function, arr:any[]) {
  var y = []
  var n = []
  for(var ele of arr) {
    if(f(ele)) y.push(ele)
    else n.push(ele)
  }
  return [y, n]
}
