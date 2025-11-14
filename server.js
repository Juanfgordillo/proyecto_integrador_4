const express = require("express");
console.log("=== SERVIDOR CORRECTO ===");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

// BASE DE DATOS
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "foodgo",
  password: "admin123",
  port: 5432,
});

// MIDDLEWARES
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(session({
  name: "foodgo.sid",
  secret: "clave-secreta-foodgo-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// RUTAS HTML

// Página principal = login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// Rutas a páginas internas
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/registro", (req, res) => {
  res.sendFile(path.join(__dirname, "registro.html"));
});

app.get("/pedidos", (req, res) => {
  res.sendFile(path.join(__dirname, "pedidos.html"));
});

app.get("/repartidor", (req, res) => {
  res.sendFile(path.join(__dirname, "repartidor.html"));
});

// Página cliente después de login
app.get("/cliente", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Ruta login backend
app.post("/login", async (req, res) => {
  try {
    const { id_usuario, password } = req.body;

    const query = `
      SELECT u.id_cliente AS cedula, u.contrasena, u.id_rol, c.nombre
      FROM Usuario u
      JOIN Cliente c ON c.cedula = u.id_cliente
      WHERE u.id_cliente = $1
    `;

    const result = await pool.query(query, [id_usuario]);

    if (result.rows.length === 0) {
      return res.json({ success: false, error: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.contrasena);

    if (!valid) {
      return res.json({ success: false, error: "Contraseña incorrecta" });
    }

    const rolMap = {
      1: "admin",
      2: "repartidor",
      3: "cliente"
    };

    const rol = rolMap[user.id_rol] || "cliente";

    req.session.user = {
      cedula: user.cedula,
      nombre: user.nombre,
      rol: rol
    };

    res.json({
      success: true,
      user: req.session.user
    });

  } catch (err) {
    console.log("Error login:", err);
    res.json({ success: false, error: "Error servidor" });
  }
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

// REGISTRO DE USUARIO
console.log(">>> CARGANDO RUTA POST /registro");
app.post('/registro', async (req, res) => {
  try {
    const {
      cedula,
      nombre,
      apellido,
      municipio,
      numero,
      calle,
      telefono1,
      telefono2,
      password,
      rol
    } = req.body;

    if (!cedula || !nombre || !apellido || !municipio || !numero || !calle || !telefono1 || !telefono2 || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const municipioResult = await pool.query(
      `SELECT ID_Municipio FROM Municipio WHERE Nombre = $1`,
      [municipio.trim()]
    );

    if (municipioResult.rows.length === 0) {
      return res.status(400).json({ error: 'El municipio ingresado no existe' });
    }

    const idMunicipio = municipioResult.rows[0].id_municipio;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query('BEGIN');

    await pool.query(
      `INSERT INTO Cliente (Cedula, Nombre, Apellido, ID_Municipio, Numero, Calle)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cedula, nombre, apellido, idMunicipio, numero, calle]
    );

    await pool.query(
      `INSERT INTO Usuario (ID_Cliente, Usuario, Contrasena, ID_Rol)
       VALUES ($1, $2, $3, $4)`,
      [cedula, cedula, hashedPassword, rol]
    );

    await pool.query(
      `INSERT INTO Telefono (Cedula, Telefono) VALUES ($1, $2), ($1, $3)`,
      [cedula, telefono1, telefono2]
    );

    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      usuario: { cedula, rol }
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al registrar usuario:', error);

    if (error.code === '23505') {
      res.status(400).json({ error: 'La cédula o teléfono ya está registrado' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Verificar sesión
app.get("/check-session", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      loggedIn: true,
      user: req.session.user  
    });
  }
  res.json({ loggedIn: false });
});

// Cerrar sesión
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error cerrando sesión:", err);
      return res.status(500).send("Error al cerrar sesión");
    }

    res.clearCookie("foodgo.sid");
    res.redirect("/login.html");
  });
});

// LOGIN
app.get("/session", (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }
  res.json({ 
    loggedIn: true, 
    user: {
      id_cliente: req.session.user.id,
      nombre: req.session.user.nombre,
      direccion: req.session.user.direccion   
    }
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// 🚀 Productos

app.get("/api/productos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ID_Producto AS id_producto,
        Nombre AS nombre,
        Precio AS precio,
        Descripcion AS descripcion,
        Imagen AS imagen
      FROM Producto
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error consultando productos:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Editar producto
app.put("/api/productos/:id", async (req, res) => {
  const { nombre, tipo, precio } = req.body;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE Producto SET Nombre=$1, Precio=$2 WHERE ID_Producto=$3 RETURNING *`,
      [nombre, precio, id]
    );
    res.json({ success: true, producto: result.rows[0] });
  } catch (err) {
    console.error("❌ Error editando producto:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear producto
app.post("/api/productos", async (req, res) => {
  const { nombre, tipo, precio } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Producto (Nombre, Precio) VALUES ($1,$2) RETURNING *`,
      [nombre, precio]
    );
    res.json({ success: true, producto: result.rows[0] });
  } catch (err) {
    console.error("❌ Error creando producto:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar producto
app.delete("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM Producto WHERE ID_Producto=$1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error eliminando producto:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Obtener lista de departamentos
app.get('/departamentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Departamento ORDER BY Nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
});

// CRUD DEPARTAMENTOS (ADMIN)
// OBTENER TODOS LOS DEPARTAMENTOS
app.get("/api/departamentos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Departamento ORDER BY id_departamento ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener departamentos:", err);
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});

app.post("/api/departamentos", async (req, res) => {
  const { nombre } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO Departamento (nombre) VALUES ($1) RETURNING *",
      [nombre]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al crear departamento:", err);
    res.status(500).json({ error: "Error al crear departamento" });
  }
});

app.put("/api/departamentos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    const result = await pool.query(
      "UPDATE Departamento SET nombre = $1 WHERE id_departamento = $2 RETURNING *",
      [nombre, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al actualizar departamento:", err);
    res.status(500).json({ error: "Error al actualizar departamento" });
  }
});

app.delete("/api/departamentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM Departamento WHERE id_departamento = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error al eliminar departamento:", err);
    res.status(500).json({ error: "Error al eliminar departamento" });
  }
});

app.get("/municipios/:idDepartamento", async (req, res) => {
  try {
    const { idDepartamento } = req.params;
    const result = await pool.query(
      "SELECT id_municipio, nombre FROM municipio WHERE id_departamento = $1 ORDER BY nombre",
      [idDepartamento]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo municipios:", err);
    res.status(500).json({ error: "Error al obtener municipios" });
  }
});

// 📍 MUNICIPIOS

// Obtener todos los municipios con su departamento
// Listar municipios
app.get("/api/municipios", async (req, res) => {
  const result = await pool.query(`
    SELECT m.id_municipio, m.nombre, d.nombre AS departamento
    FROM Municipio m
    JOIN Departamento d ON m.id_departamento = d.id_departamento
    ORDER BY m.id_municipio
  `);
  res.json(result.rows);
});


// Crear un nuevo municipio
app.post("/api/municipios", async (req, res) => {
  const { nombre, id_departamento } = req.body;
  try {
    await pool.query(
      "INSERT INTO Municipio (nombre, id_departamento) VALUES ($1, $2)",
      [nombre, id_departamento]
    );
    res.json({ success: true, message: "Municipio agregado correctamente" });
  } catch (err) {
    console.error("Error agregando municipio:", err);
    res.status(500).json({ error: "Error al agregar municipio" });
  }
});

// EDITAR MUNICIPIO
app.put("/api/municipios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, id_departamento } = req.body;

    await pool.query(
      "UPDATE Municipio SET nombre = $1, id_departamento = $2 WHERE id_municipio = $3",
      [nombre, id_departamento, id]
    );

    res.json({ message: "Municipio actualizado correctamente" });
  } catch (err) {
    console.error("Error actualizando municipio:", err);
    res.status(500).json({ message: "Error actualizando municipio" });
  }
});

// ELIMINAR MUNICIPIO
app.delete("/api/municipios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM Municipio WHERE id_municipio = $1", [id]);

    res.json({ message: "Municipio eliminado correctamente" });
  } catch (err) {
    console.error("Error eliminando municipio:", err);
    res.status(500).json({ message: "Error eliminando municipio" });
  }
});

// Pedidos

app.post("/pedidos", async (req, res) => {
  if (!req.session.user || req.session.user.rol !== "cliente") {
    return res.status(401).json({ message: "No autorizado" });
  }

  const id_cliente = req.session.user.cedula; 
  const { id_tienda, fecha_entrega, hora_entrega, precio_total } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Pedido (id_cliente, id_tienda, fecha_entrega, hora_entrega, precio_total)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id_cliente, id_tienda, fecha_entrega, hora_entrega, precio_total]
    );

    res.json({ success: true, message: "Pedido creado", pedido: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error al crear el pedido" });
  }
});

// Obtener pedidos pendientes (sin repartidor)
app.get("/api/pedidos/pendientes", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM Pedido WHERE ID_Repartidor IS NULL`
  );
  res.json(rows);
});

app.get("/pedidos/repartidor", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.rol !== "repartidor") {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const cedulaRepartidor = req.session.user.cedula;

    const result = await pool.query(
      `SELECT ID_Pedido, ID_Cliente, Precio_Total, Fecha_Entrega, Hora_Entrega, ID_Tienda
       FROM Pedido
       WHERE ID_Repartidor = $1`,
      [cedulaRepartidor]
    );

    return res.json({
      success: true,
      pedidos: result.rows
    });

  } catch (error) {
    console.error("Error al obtener pedidos para repartidor:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});


app.put("/api/pedidos/asignar", async (req, res) => {
  const { id_pedido, id_repartidor } = req.body;

  try {
    await pool.query(
      `UPDATE Pedido 
       SET ID_Repartidor = $1
       WHERE ID_Pedido = $2`,
      [id_repartidor, id_pedido]
    );

    res.json({ ok: true, msg: "Repartidor asignado correctamente" });

  } catch (error) {
    console.error("Error asignando repartidor:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Obtener pedidos del cliente logueado
app.get("/pedidos/cliente", async (req, res) => {
  if (!req.session.user || req.session.user.rol !== "cliente") {
    return res.status(401).json({ message: "No autorizado" });
  }

  const idCliente = req.session.user.cedula;

  const result = await pool.query(`
    SELECT p.id_pedido, p.precio_total, p.fecha_entrega, p.hora_entrega,
           t.nombre AS tienda,
           r.nombre_completo AS repartidor
    FROM Pedido p
    JOIN Tienda t ON p.id_tienda = t.id_tienda
    LEFT JOIN Repartidor r ON p.id_repartidor = r.cedula
    WHERE p.id_cliente = $1
  `, [idCliente]);

  res.json(result.rows);
});

app.put("/pedidos/cancelar/:id", async (req, res) => {
  try {
    const idPedido = req.params.id;
    const cliente = req.session.user.cedula;

    const check = await pool.query(
      "SELECT estado FROM pedido WHERE id_pedido = $1 AND id_cliente = $2",
      [idPedido, cliente]
    );

    if (check.rows.length === 0) {
      return res.json({ success:false, error:"Pedido no encontrado" });
    }

    if (check.rows[0].estado !== "pendiente") {
      return res.json({ success:false, error:"No se puede cancelar este pedido" });
    }

    await pool.query(
      "UPDATE pedido SET estado = 'cancelado' WHERE id_pedido = $1",
      [idPedido]
    );

    res.json({ success:true, message:"Pedido cancelado" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false });
  }
});

// Listar repartidores
app.get("/api/repartidores", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT Cedula, Nombre_Completo, Telefono, ID_Municipio, ID_Tienda FROM Repartidor ORDER BY Nombre_Completo`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo repartidores:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear repartidor
app.post("/api/repartidores", async (req, res) => {
  try {
    const { cedula, nombre_completo, telefono, id_municipio, id_tienda } = req.body;
    await pool.query(
      `INSERT INTO Repartidor (Cedula, Nombre_Completo, Telefono, ID_Municipio, ID_Tienda)
       VALUES ($1,$2,$3,$4,$5)`,
      [cedula, nombre_completo, telefono, id_municipio, id_tienda]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error creando repartidor:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Editar repartidor
app.put("/api/repartidores/:cedula", async (req, res) => {
  try {
    const { cedula } = req.params;
    const { nombre_completo, telefono, id_municipio, id_tienda } = req.body;
    await pool.query(
      `UPDATE Repartidor 
       SET Nombre_Completo=$1, Telefono=$2, ID_Municipio=$3, ID_Tienda=$4
       WHERE Cedula=$5`,
      [nombre_completo, telefono, id_municipio, id_tienda, cedula]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error actualizando repartidor:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar repartidor
app.delete("/api/repartidores/:cedula", async (req, res) => {
  try {
    const { cedula } = req.params;
    await pool.query(`DELETE FROM Repartidor WHERE Cedula=$1`, [cedula]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error eliminando repartidor:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/pedidos/repartidor', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.rol !== 'repartidor') {
            return res.status(401).json({ error: "No autorizado" });
        }

        const cedulaRepartidor = req.session.user.cedula;

        const result = await pool.query(
            `SELECT ID_Pedido, Precio_Total, Hora_Entrega, Fecha_Entrega, ID_Tienda, ID_Cliente, estado
             FROM Pedido
             WHERE ID_Repartidor = $1`,
            [cedulaRepartidor]
        );

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.put('/pedidos/estado/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.rol !== 'repartidor') {
            return res.status(401).json({ error: "No autorizado" });
        }

        const idPedido = req.params.id;
        const { estado } = req.body;
        const cedulaRepartidor = req.session.user.cedula;

        const check = await pool.query(
            `SELECT * FROM Pedido WHERE ID_Pedido = $1 AND ID_Repartidor = $2`,
            [idPedido, cedulaRepartidor]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ error: "No puedes modificar este pedido" });
        }

        await pool.query(
            `UPDATE Pedido SET estado = $1 WHERE ID_Pedido = $2`,
            [estado, idPedido]
        );

        res.json({ success: true, message: "Estado actualizado" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// USUARIOS
app.get("/api/usuarios", async (req, res) => {
  try {
  const result = await pool.query(`
  SELECT u.id_cliente, u.usuario, u.activo, r.nombre AS rol
  FROM Usuario u
  JOIN Rol r ON u.id_rol = r.id
`);

res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const { ID_Cliente, Usuario, Contrasena, ID_Rol, Activo } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Usuario (ID_Cliente, Usuario, Contrasena, ID_Rol, Activo)
       VALUES ($1,$2, crypt($3, gen_salt('bf')), $4, $5)`,
      [ID_Cliente, Usuario, Contrasena, ID_Rol, Activo]
    );
    res.json({ message: "✅ Usuario creado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando usuario" });
  }
});

app.put("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { Usuario, Contrasena, ID_Rol, Activo } = req.body;

  try {
    if (Contrasena) {
      await pool.query(
        `UPDATE Usuario
         SET Usuario=$1, Contrasena = crypt($2, gen_salt('bf')), ID_Rol=$3, Activo=$4
         WHERE ID_Cliente=$5`,
        [Usuario, Contrasena, ID_Rol, Activo, id]
      );
    } else {
      await pool.query(
        `UPDATE Usuario
         SET Usuario=$1, ID_Rol=$2, Activo=$3
         WHERE ID_Cliente=$4`,
        [Usuario, ID_Rol, Activo, id]
      );
    }

    res.json({ message: "✅ Usuario actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});

app.delete("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM Usuario WHERE ID_Cliente=$1", [id]);
    res.json({ message: "🗑️ Usuario eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

// TIENDAS
// Obtener todas las tiendas
app.get("/api/tiendas", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Tienda");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error consultando tiendas:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear tienda
app.post("/api/tiendas", async (req, res) => {
  const { nombre, direccion, id_municipio } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO Tienda (Nombre, Direccion, ID_Municipio) VALUES ($1,$2,$3) RETURNING *",
      [nombre, direccion, id_municipio]
    );
    res.json({ success: true, tienda: result.rows[0] });
  } catch (err) {
    console.error("❌ Error creando tienda:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Editar tienda
app.put("/api/tiendas/:id", async (req, res) => {
  const { nombre, direccion, id_municipio } = req.body;
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE Tienda SET Nombre=$1, Direccion=$2, ID_Municipio=$3 WHERE ID_Tienda=$4 RETURNING *",
      [nombre, direccion, id_municipio, id]
    );
    res.json({ success: true, tienda: result.rows[0] });
  } catch (err) {
    console.error("❌ Error editando tienda:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar tienda
app.delete("/api/tiendas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM Tienda WHERE ID_Tienda=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error eliminando tienda:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/tiendas/municipio/:idMunicipio", async (req,res)=>{
  try{
    const { idMunicipio } = req.params;
    const result = await pool.query(
      "SELECT id_tienda, nombre FROM tienda WHERE id_municipio=$1 ORDER BY nombre",
      [idMunicipio]
    );
    res.json(result.rows);
  }catch(err){
    console.error(err);
    res.status(500).json({error:"Error al obtener tiendas"});
  }
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log("====================================");
  console.log("SERVIDOR FOODGO");
  console.log(`http://localhost:${PORT}`);
  console.log("====================================");
});