/**
 * 公用验证规则
 * Created by likaituan on 15/8/21.
 */

    module.exports = {
        //手机号码
        cellphone: {
            number:true,
            bit:11,
            re: /^1\d{10}$/
        },
        //银行卡号
        bankcard: {
            number:true,
            bit:"13-19",
	        empty_title:"银行卡号格式不正确"
        },
        //身份证号码
        nationalId:{
            bit:[15,18],
            re:/^\d{15}$|^\d{18}$|^\d{17}X$/
        },
        //真实姓名
        real_name: {
            chinese:true,
            minLen:2
        },
        //邮箱地址
        email: {
            minLen:5,
            re:/^[\w\-]+@([\w\-]+\.)+(com|net|cn|com\.cn|cc|info|me|org)$/
        }
    };
