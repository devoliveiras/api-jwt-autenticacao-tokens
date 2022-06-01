const passport = require('passport');
const Usuario = require('./usuarios-modelo');
const usuario = require('./usuarios-modelo');
const { InvalidArgumentError } = require('../erros');
const allowlistRefreshToken = require('../../redis/allowlist-refresh-token');
const { buscaValor } = require('../../redis/allowlist-refresh-token');
const tokens = require('./tokens');


async function verificaRefreshToken(refreshToken){
    if(!refreshToken){
        throw new InvalidArgumentError('Refresh não enviado!');
    }
    const id = await allowlistRefreshToken.buscaValor(refreshToken);
    if(!id){
        throw new InvalidArgumentError('Refresh token invalido!');
    }
    return id;
}

async function invalidaRefreshToken(refreshToken){
    await allowlistRefreshToken.deleta(refreshToken);

}

module.exports = {
    local: (req, res, next) =>{
    passport.authenticate(
        'local',
        { session: false },
        (erro, usuario, info) => {
            if (erro && erro.name === 'InvalidArgumentError'){
                return res.status(401).json({ erro: erro.message });
            }

            if (erro){
                return res.status(500).json({ erro: erro.message });
            }

            if (!usuario){
                return res.status(401).json();
            }

            req.user = usuario;
            return next();
        }
        ) (req, res, next);
    },

    bearer: (req, res, next) => {
        passport.authenticate(
            'bearer',
            {session: false},
            (erro, usuario, info) => {

                if (erro && erro.name === 'jsonWebTokenError'){
                    return res.status(401).json({ erro: erro.message });
                }

                if (erro && erro.name === 'TokenExpiredError'){
                    return res.status(401).json({ erro: erro.message, expiradoEm: erro.expiredAt });
                }

                if (erro){
                    return res.status(500).json({ erro: erro.message });
                }

                if (!usuario){
                    return res.status(401).json();
                }

                req.user = usuario;
                return next();
            }
        ) (req,res, next)
    },

    async refresh (req, res, next) {
        try {
            const { refreshToken } = req.body;
            const id = await verificaRefreshToken(refreshToken);
            await invalidaRefreshToken(refreshToken);
            req.user = await Usuario.buscaPorId(id);
            return next();            
        } catch (erro) {
            if(erro.name === 'InvalidArumentError'){
                return res.status(401).json({erro: erro.message})
            }
            return res.status(500).json({erro: erro.message})
        }


    },

    async verificacaoEmail(req, res, next){
        try {
            const {token} = req.params;
            const id = await tokens.verificacaoEmail.verifica(token)
            const usuario = await Usuario.buscaPorId(id);
            res.user = usuario;
            next();            
        } catch (erro) {
            if(erro.name === 'jsonWebTokenError'){
                return res.status(401).json({erro: erro.message})
            }
            if(erro.name === 'TokenExpiredError'){
                return res.status(401).json({erro: erro.message, expiradoEm: erro.expiredAt})
            }
            return res.status(500).json({erro: erro.message})
        }
        }


    }