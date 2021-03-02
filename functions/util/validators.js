const { user } = require("firebase-functions/lib/providers/auth");

//Verificar se Email é válido (regular Expression) 
const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
}

//Verificar se Email está vazio
const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

exports.validateSignupData = (data) => {
    let errors = {};

    if(isEmpty(data.email)){
        errors.email = 'Email deve ser preenchido'
    }   else if(!isEmail(data.email)){
        errors.email = 'Email inválido'
    }

    if(isEmpty(data.password)) errors.password = 'Campo deve ser preenchido';
    if(data.password !== data.confirmPassword) errors.confirmPassword = 'Confirmação de senha não confere';
    if(isEmpty(data.handle)) errors.handle = 'Campo deve ser preenchido';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}


exports.validateLoginData = (data) => {
    let errors = {};

    if(isEmpty(data.email)) errors.email = 'Campo está vazio';
    if(isEmpty(data.password)) errors.password = 'Campo está vazio';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.reduceUserDetails = (data) => {
    let userDetails = {};

    if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    if(!isEmpty(data.website.trim())){
        //https://podcastx.com
        if(data.website.trim().substring(0, 4) !== 'http'){
            userDetails.website = `https://${data.website.trim()}`;
        }   else userDetails.website = data.website;
    }

    if(!isEmpty(data.location.trim())) userDetails.location = data.location;

    return userDetails;
};