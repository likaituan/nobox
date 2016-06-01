/**
 * Created by likaituan on 15/8/16.
 */

module.exports = {
    //匹配数字
    number: /^\d+(?:\.\d+)?$/,
    //匹配数字或字母或下划线
    number_or_letter: /^\w+$/,
    //匹配数字和字母的组合
    number_and_letter: /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]+$/,
    //匹配整形数字
    int: /^\d+$/,
    //匹配字母
    letter: /^[a-z]+$/i,
    //匹配中文
    chinese: /^[\u4e00-\u9fa5]+$/
};
