const fs = require('fs');
const https = require('https');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
// const admin = require('firebase-admin');
const mysql = require('mysql2');
var crypto = require('crypto');

var connection = mysql.createConnection({
    host: '191.252.185.150',
    user: 'codequest',
    password: 'ae58ff094505eb2b61d838691a1dbc2e',
    database: 'codequest'
});

// Inicialize o Firebase Admin SDK
// const serviceAccount = require('./firebaseConfig.json');
// const { constrainedMemory } = require('process');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

// const db = admin.firestore();
// const usersCollection = db.collection('users');
const app = express();
const PORT = process.env.PORT || 80;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

let loggedInUserId = null;

async function verifyAuth(req, res, next) {
    const authorizationHeader = req.headers['authorization'];
    if (authorizationHeader) {
        const token = authorizationHeader.split(' ')[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (userDoc.exists) {
                req.user = userDoc.data();
                req.user.uid = decodedToken.uid;
                loggedInUserId = decodedToken.uid; // Armazenar o ID do usuário logado
                return next();
            }
        } catch (error) {
            console.error('Erro na verificação de token:', error);
        }
    }
    res.status(401).json({ success: false, message: 'Não autorizado' });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'acesso.html'));
});

app.post('/receber', async (req, res) => {
    const { email, password } = req.body;
    try {
        connection.query("SELECT * FROM users WHERE email = '" + email + "' AND password = SHA1('" + password + "')", function (err, result, fields) {
            if (result.length < 1) {
                console.log("Email ou senha inválidos");
                return res.status(401).json({ success: false, message: "Email ou senha inválidos" });
            } else {
                docId = result[0].id;
                console.log(docId);
                isAdmin = (result[0].isAdmin == 1);
                const redirectUrl = isAdmin ? '/admin' : '/escolhas';
                return res.json({ success: true, redirectUrl: redirectUrl, authToken: docId, userInfo: result[0] });
            }
        });


        // const querySnapshot = await usersCollection.where('email', '==', email).where('password', '==', password).get();

        // if (querySnapshot.empty) {
        //     console.log("Email ou senha inválidos");
        //     return res.status(401).json({ success: false, message: "Email ou senha inválidos" });
        // } else {
        //     docId = querySnapshot.docs[0].id;
        //     console.log(docId);

        //     // Determine se o usuário é admin ou não (você precisa implementar essa lógica)
        //     const isAdmin = false; // ou true, dependendo da lógica de autenticação/admin



        //     const redirectUrl = isAdmin ? '/admin' : '/escolhas';
        //     return res.json({ success: true, redirectUrl: redirectUrl, authToken: docId, userInfo: querySnapshot.docs[0].data() });
        // }
    } catch (error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/perfil', async (req, res) => {
    const { id } = req.body;
    try {
        connection.query("SELECT * FROM users WHERE id = '" + id + "'", function (err, result, fields) {
            if(result.length > 0) {
                delete result[0].password;
                return res.json({ success: true, userInfo: result[0] });
            } else {
                console.error("Erro ao verificar credenciais:", error);
                return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });        
            }
        });
    } catch (error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }

});

app.post('/enviarDesafio', async (req, res) => {
    const { id_usuario, id_desafio, tempo_gasto, resposta } = req.body;
    try {
        connection.query("INSERT INTO solucoes VALUES (NULL," + id_desafio + "," + id_usuario + ",'"+ tempo_gasto + "'," +"'"+resposta+"')" , function (err, result, fields) {
            if(err) { throw err; }
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/consultaDesafio', async (req, res) => {
    const { id_usuario, id_desafio } = req.body;
    try {
        connection.query("SELECT * FROM solucoes WHERE aluno = "+ id_usuario +" AND desafio = "+ id_desafio, function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/solucoes', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        connection.query("SELECT MAX(solucoes.id) as id, MAX(solucoes.texto) as texto, MAX(dificuldade.nome) as dificuldade, MAX(desafios.numero) as numero FROM `solucoes` LEFT JOIN desafios ON desafio = desafios.id LEFT JOIN dificuldade ON desafios.dificuldade = dificuldade.id  WHERE aluno = " + id_usuario + " GROUP BY desafio", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/enturmado', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        connection.query("SELECT turma.* FROM `enturmado` LEFT JOIN turma ON turma = turma.id WHERE aluno = " + id_usuario + " ", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/minhasturmas', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        connection.query("SELECT turma.* FROM turma WHERE professor = " + id_usuario + " ", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/meusdesafios', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        connection.query("SELECT desafios.id, desafios.numero, desafios.texto, dificuldade.nome as dificuldade, dificuldade.img FROM desafios LEFT JOIN dificuldade ON dificuldade=dificuldade.id WHERE professor = " + id_usuario + " ", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/respostas/:desafioId', async (req, res) => {
    const { desafioId } = req.params;
    try {
        connection.query("SELECT solucoes.*, users.id as aluno_id, users.nome as aluno FROM solucoes LEFT JOIN users ON aluno = users.id WHERE desafio = " + desafioId, function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.get("/admin_turma/:turmaId", async (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'admin_turma.html'));
});    

app.post("/admin_turma/:turmaId", async (req, res) => {
    const { turmaId } = req.params;
    try {
        connection.query("SELECT enturmado.id, users.nome, users.email, users.telefone FROM enturmado LEFT JOIN users ON aluno=users.id WHERE turma = " + turmaId, function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, turma: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/alunosnaoenturmados', async (req, res) => {
    const { turma } = req.body;
    try {
        connection.query("SELECT id, nome FROM users WHERE id NOT IN (SELECT aluno FROM enturmado WHERE turma = " + turma + ")", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/enturmar', async (req, res) => {
    const { aluno, turma } = req.body;
    try {
        connection.query("INSERT INTO enturmado VALUES (NULL," + turma + "," + aluno + ")", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/desenturmar/:id_enturmado', async (req, res) => {
    const { id_enturmado } = req.params;
    try {
        connection.query("DELETE FROM enturmado WHERE id = " + id_enturmado, function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, respostas: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.get('/admin_desafios', async (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'admin_desafios.html'));
});

app.post('/admin_desafios', async (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'admin_desafios.html'));
});

app.get('/admin_desafio/:id', async (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'admin_desafio.html'));
});

app.post('/salvarPerfil', async (req, res) => {
    const { id, nome, email, instituicao } = req.body;
    try {
        connection.query("UPDATE users SET nome = '" + nome + "', instituicao = '" + instituicao +"' WHERE id = "+ id, function (err, result, fields) {
            if(err) { throw err; } 
            connection.query("SELECT * FROM users WHERE id = '" + id + "'", function (err, result, fields) {
                delete result[0].password;
                return res.json({ success: true, userInfo: result[0] });
            });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.post('/salvarNovoDesafio', async(req, res) => {
    const { numero, texto, dificuldade, id_usuario } = req.body;
    try {
        connection.query("INSERT INTO desafios VALUES (NULL,'" + dificuldade + "'," + numero + ",'" + texto + "','" + id_usuario +"')", function (err, result, fields) {
            if(err) { throw err; } 
            return res.json({ success: true, desafio: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }

});


app.post('/sac', async (req, res) => {
    const { id_usuario, texto } = req.body;
    try {
        connection.query("INSERT INTO sac VALUES (NULL,"+ id_usuario +",'"+texto+"')" ,[id_usuario, texto], function (err, result, fields) {
            return res.json({ success: true, sac: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    }
});

app.get('/dados', (req, res) => {
    res.send('Esta é a resposta do servidor para a chamada AJAX.');
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/escolhas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'escolhas.html'));
});

app.get('/opcao/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'opcao.html'));
});

app.post('/opcao/:id', (req, res) => {
    var id = req.params.id;
    try {
        connection.query("SELECT * FROM dificuldade WHERE id = " + id, function (err, result, fields) {
            if (err) { throw err; } 
            connection.query("SELECT desafios.*, users.nome as professor FROM desafios LEFT JOIN users ON professor = users.id WHERE dificuldade = " + id, function (err, result2, fields) {
                if(err) { throw err; } 
                return res.json({ success: true, resposta: result, desafios: result2 });
            });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    
    }
});

app.get('/desafio_id/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafio.html'));
});

app.post('/desafio_id/:id', (req, res) => {
    var id = req.params.id;
    try {
        connection.query("SELECT desafios.*, users.nome as professor FROM desafios LEFT JOIN users ON professor=users.id WHERE desafios.id = " + id, function (err, result, fields) {
            if (err) { throw err; } 
            return res.json({ success: true, resposta: result });
        });
    } catch(error) {
        console.error("Erro ao verificar credenciais:", error);
        return res.status(500).json({ success: false, message: "Erro ao verificar credenciais" });
    
    }
});

app.get('/opcao0', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'opcao0.html'));
});

app.get('/opcao1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'opcao1.html'));
});

app.get('/opcao2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'opcao2.html'));
});

app.get('/opcao3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'opcao3.html'));
});

app.get('/desafio/0_1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio0_1.html'));
});

app.get('/desafio/0_2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio0_2.html'));
});

app.get('/desafio/0_3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio0_3.html'));
});

app.get('/desafio/0_4', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio0_4.html'));
});

app.get('/desafio/1_1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio1_1.html'));
});

app.get('/desafio/1_2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio1_2.html'));
});

app.get('/desafio/1_3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio1_3.html'));
});

app.get('/desafio/1_4', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio1_4.html'));
});

app.get('/desafio/2_1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio2_1.html'));
});

app.get('/desafio/2_2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio2_2.html'));
});

app.get('/desafio/2_3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio2_3.html'));
});

app.get('/desafio/2_4', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio2_4.html'));
});

app.get('/desafio/3_1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio3_1.html'));
});

app.get('/desafio/3_2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio3_2.html'));
});

app.get('/desafio/3_3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio3_3.html'));
});

app.get('/desafio/3_4', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desafios', 'desafio3_4.html'));
});

app.get('/turmas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'turmas.html'));
});

app.get('/solucoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'solucoes.html'));
});

app.get('/sac', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sac.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'perfil.html'));
});



app.post('/send', async (req, res) => {
    const { iniciante1, iniciante2, iniciante3 } = req.body;

    // Cria um objeto de atualização sem valores undefined
    const updateData = {};
    if (iniciante1 !== undefined) updateData.iniciante1 = iniciante1;
    if (iniciante2 !== undefined) updateData.iniciante2 = iniciante2;
    if (iniciante3 !== undefined) updateData.iniciante3 = iniciante3;

    try {
        await db.collection('users').doc(docId).update(updateData);
        return res.json('Códigos enviados com sucesso');
    } catch (error) {
        console.error("Erro ao enviar códigos:", error);
        return res.status(500).json({ error: "Erro ao enviar códigos" });
    }
});



app.post('/send-challenges-intermediate', async (req, res) => {
    const { challenge1, challenge2 } = req.body;

    if (challenge1 && challenge2 && loggedInUserId) {
        try {
            const userRef = db.collection('users').doc(loggedInUserId);
            await userRef.update({
                intermediateChallenges: admin.firestore.FieldValue.arrayUnion({ challenge1, challenge2 })
            });
            res.json({ success: true, message: 'Respostas intermediárias armazenadas com sucesso.' });
        } catch (error) {
            console.error('Erro ao armazenar desafios intermediários:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Respostas ou ID do usuário não podem ser vazios.' });
    }
});

// Adiciona o endpoint de registro
app.post('/register', async (req, res) => {
    const { name, email, password, admin } = req.body;
    
    connection.query("INSERT INTO users VALUES (NULL, " + admin + ",'" + email + "', SHA1('" + password + "'), '" + name +"','','')" , function (err, result, fields) {
        if (err) { return res.status(500).json({ success: false, message: 'Erro ao criar usuário', error: err }); }
        console.log(result);
        return res.json("tudo certo")
    });
    // admin.auth().createUser({
    //     email: email,
    //     password: password
    // })
    //     .then((userRecord) => {
    //         db.collection('users').doc(userRecord.uid).set({
    //             email: email,
    //             password: password
    //         })
    //             .then(() => {
    //                 console.log("Uhuuu")
    //             })
    //         console.log('Usuário criado com sucesso', userRecord.uid);
    //     })
    //     .catch((error) => {
    //         console.error('Erro ao criar usuário:', error);
    //     });
    // return res.json("tudo certo")
})

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.use((req, res, next) => {
    if (req.secure) {
        return next();
    }
    res.redirect(`https://${req.headers.host}${req.url}`);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const keyPath = '/etc/letsencrypt/live/codequest.ddns.net/privkey.pem';
const certPath = '/etc/letsencrypt/live/codequest.ddns.net/fullchain.pem';

const privateKey = fs.readFileSync(keyPath, 'utf8');
const certificate = fs.readFileSync(certPath, 'utf8');

const credentials = { key: privateKey, cert: certificate };

// Servidor HTTPS
const httpsServer = https.createServer(credentials, app);

const SSL_PORT = 443;

httpsServer.listen(SSL_PORT, () => {
    console.log(`Servidor HTTPS rodando na porta ${SSL_PORT}`);
});
