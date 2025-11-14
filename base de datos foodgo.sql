-- Creación de la base de datos

CREATE DATABASE foodgo;

--  DEPARTAMENTOS Y MUNICIPIOS

CREATE TABLE Departamento (
    ID_Departamento SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL
);

CREATE TABLE Municipio (
    ID_Municipio SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    ID_Departamento INT NOT NULL,
    FOREIGN KEY (ID_Departamento) REFERENCES Departamento(ID_Departamento)
);


--  TIENDAS, CLIENTES Y REPARTIDORES

CREATE TABLE Tienda (
    ID_Tienda SERIAL PRIMARY KEY,
    Direccion VARCHAR(150) NOT NULL,
    ID_Municipio INT NOT NULL,
    FOREIGN KEY (ID_Municipio) REFERENCES Municipio(ID_Municipio)
);

CREATE TABLE Cliente (
    Cedula VARCHAR(20) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Apellido VARCHAR(100) NOT NULL,
    ID_Municipio INT NOT NULL,
    Numero VARCHAR(20),
    Calle VARCHAR(100),
    FOREIGN KEY (ID_Municipio) REFERENCES Municipio(ID_Municipio)
);

CREATE TABLE Telefono (
    Cedula VARCHAR(20) NOT NULL,
    Telefono VARCHAR(20) NOT NULL,
    PRIMARY KEY (Cedula, Telefono),
    FOREIGN KEY (Cedula) REFERENCES Cliente(Cedula)
);

CREATE TABLE Repartidor (
    Cedula VARCHAR(20) PRIMARY KEY,
    Nombre_Completo VARCHAR(150) NOT NULL,
    Telefono VARCHAR(20) NOT NULL,
    ID_Municipio INT NOT NULL,
    ID_Tienda INT NOT NULL,
    FOREIGN KEY (ID_Municipio) REFERENCES Municipio(ID_Municipio),
    FOREIGN KEY (ID_Tienda) REFERENCES Tienda(ID_Tienda)
);

--  CATEGORÍAS Y PRODUCTOS

CREATE TABLE Categoria (
    ID_Categoria SERIAL PRIMARY KEY,
    Nombre VARCHAR(100)
);

CREATE TABLE Producto (
    ID_Producto SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Precio DECIMAL(10,2) NOT NULL,
    Descripcion TEXT,
    Imagen VARCHAR(255)
);

CREATE TABLE Pizza (
    ID_Producto INT PRIMARY KEY,
    ID_Categoria INT NOT NULL,
    Tamano VARCHAR(50),
    Ingrediente TEXT,
    FOREIGN KEY (ID_Producto) REFERENCES Producto(ID_Producto),
    FOREIGN KEY (ID_Categoria) REFERENCES Categoria(ID_Categoria)
);

CREATE TABLE Hamburguesa (
    ID_Producto INT PRIMARY KEY,
    Tipo_Carne VARCHAR(50),
    Doble_Combo BOOLEAN,
    Acompanamiento VARCHAR(100),
    FOREIGN KEY (ID_Producto) REFERENCES Producto(ID_Producto)
);

CREATE TABLE Bebida (
    ID_Producto INT PRIMARY KEY,
    Temperatura VARCHAR(50),
    Tipo VARCHAR(50),
    Tamano VARCHAR(50),
    FOREIGN KEY (ID_Producto) REFERENCES Producto(ID_Producto)
);

--  PEDIDOS

CREATE TABLE Pedido (
    ID_Pedido SERIAL PRIMARY KEY,
    Precio_Total DECIMAL(10,2),
    Hora_Entrega TIME,
    Fecha_Entrega DATE,
    ID_Repartidor VARCHAR(20),
    ID_Tienda INT NOT NULL,
    FOREIGN KEY (ID_Repartidor) REFERENCES Repartidor(Cedula),
    FOREIGN KEY (ID_Tienda) REFERENCES Tienda(ID_Tienda)
);

ALTER TABLE Pedido ADD COLUMN ID_Cliente VARCHAR(20);
ALTER TABLE Pedido
ADD CONSTRAINT fk_pedido_cliente
FOREIGN KEY (ID_Cliente) REFERENCES Cliente(Cedula);

--  ESTADO Y HISTORIAL DE PEDIDOS

CREATE TABLE Estado_Pedido (
    ID_Estado_Pedido SERIAL PRIMARY KEY,
    Nombre_Estado VARCHAR(50) NOT NULL,
    ID_Pedido INT NOT NULL,
    FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido)
);

CREATE TABLE Producto_Pedido (
    ID_Producto INT NOT NULL,
    ID_Pedido INT NOT NULL,
    Cantidad INT NOT NULL,
    Precio_Unitario DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (ID_Producto, ID_Pedido),
    FOREIGN KEY (ID_Producto) REFERENCES Producto(ID_Producto),
    FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido)
);

CREATE TABLE Historial_Pedido (
    ID SERIAL PRIMARY KEY,
    Identificador_Pedido INT NOT NULL,
    Hora_Registro TIMESTAMP,
    FOREIGN KEY (Identificador_Pedido) REFERENCES Pedido(ID_Pedido)
);

--  USUARIOS Y ROLES

CREATE TABLE Rol (
    ID SERIAL PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL
);

CREATE TABLE Usuario (
    ID_Cliente VARCHAR(20) PRIMARY KEY,
    Usuario VARCHAR(50) NOT NULL UNIQUE,
    Contrasena VARCHAR(255) NOT NULL,
    Activo BOOLEAN DEFAULT TRUE,
    ID_Rol INTEGER,
    FOREIGN KEY (ID_Cliente) REFERENCES Cliente(Cedula)
);

CREATE TABLE Usuario_Rol (
    ID_Usuario VARCHAR(20) NOT NULL,
    ID_Rol INT NOT NULL,
    PRIMARY KEY (ID_Usuario, ID_Rol),
    FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Cliente),
    FOREIGN KEY (ID_Rol) REFERENCES Rol(ID)
);

--  ALTER TABLES ADICIONALES

ALTER TABLE Categoria ADD COLUMN Estado BOOLEAN DEFAULT TRUE;
ALTER TABLE Tienda ADD COLUMN Nombre VARCHAR(100);

--  INSERTAR DATOS DE EJEMPLO

INSERT INTO Rol(Nombre) VALUES('admin'),('repartidor'),('cliente');

INSERT INTO Departamento (Nombre) VALUES('Antioquia'),('Cundinamarca'),('Valle del Cauca');
INSERT INTO Municipio (Nombre, ID_Departamento) VALUES
('Medellín', 1),
('Envigado', 1),
('Bogotá', 2),
('Cali', 3);

INSERT INTO Tienda (Direccion, ID_Municipio) VALUES
('Cra 45 #12-34', 1),
('Av 80 #50-22', 2),
('Calle 26 #45-18', 3),
('Av Roosevelt #30-55', 4);

INSERT INTO Cliente (Cedula, Nombre, Apellido, ID_Municipio, Numero, Calle) VALUES
('1001', 'Juan', 'Pérez', 1, '45', 'Calle 10'),
('1002', 'María', 'López', 2, '12', 'Carrera 50'),
('1003', 'Carlos', 'García', 3, '78', 'Avenida 26'),
('1004', 'Ana', 'Torres', 4, '23', 'Calle 5');

INSERT INTO Telefono (Cedula, Telefono) VALUES
('1001', '3001112233'),
('1002', '3012223344'),
('1003', '3023334455'),
('1004', '3034445566');

INSERT INTO Repartidor (Cedula, Nombre_Completo, Telefono, ID_Municipio, ID_Tienda) VALUES
('2001', 'Luis Ramírez', '3105551111', 1, 1),
('2002', 'Pedro Gómez', '3115552222', 2, 2),
('2003', 'Laura Martínez', '3125553333', 3, 3);

INSERT INTO Categoria (Nombre) VALUES('Pizzas'),('Hamburguesas'),('Bebidas');

INSERT INTO Producto (Nombre, Precio, Descripcion, Imagen) VALUES
('Pizza Hawaiana', 25000, 'Pizza con jamón y piña', 'pizza_hawaiana.jpg'),
('Hamburguesa Doble', 18000, 'Doble carne con queso y tocineta', 'hamburguesa_doble.jpg'),
('Coca-Cola 400ml', 5000, 'Bebida gaseosa fría', 'cocacola.jpg'),
('Pizza Mexicana', 27000, 'Con jalapeños, carne y maíz', 'pizza_mexicana.jpg');

INSERT INTO Pizza (ID_Producto, ID_Categoria, Tamano, Ingrediente) VALUES
(1, 1, 'Grande', 'Jamón, piña, queso mozzarella'),
(4, 1, 'Mediana', 'Carne molida, jalapeños, maíz, queso');

INSERT INTO Hamburguesa (ID_Producto, Tipo_Carne, Doble_Combo, Acompanamiento) VALUES
(2, 'Res', TRUE, 'Papas a la francesa');

INSERT INTO Bebida (ID_Producto, Temperatura, Tipo, Tamano) VALUES
(3, 'Fría', 'Gaseosa', '400ml');

INSERT INTO Pedido (Precio_Total, Hora_Entrega, Fecha_Entrega, ID_Repartidor, ID_Tienda, ID_Cliente) VALUES
(30000, '13:00', '2025-11-06', '2001', 1, '1001'),
(23000, '19:30', '2025-11-06', '2002', 2, '1002');

INSERT INTO Producto_Pedido (ID_Producto, ID_Pedido, Cantidad, Precio_Unitario) VALUES
(1, 1, 1, 25000),
(3, 1, 1, 5000),
(2, 2, 1, 18000),
(3, 2, 1, 5000);

INSERT INTO Historial_Pedido (Identificador_Pedido) VALUES
(1),
(2);

INSERT INTO Usuario (ID_Cliente, Usuario, Contrasena, Activo) VALUES
('1001', 'juanp', '123456', TRUE),
('1002', 'marial', '123456', TRUE),
('1003', 'carlosg', '123456', TRUE),
('1004', 'anat', '123456', TRUE);

INSERT INTO Usuario_Rol (ID_Usuario, ID_Rol) VALUES
('1001', 3),
('1002', 1), -- María -> Admin
('1003', 3),
('1004', 3);

-- SELECTS FINALES PARA VERIFICACIÓN

SELECT * FROM Cliente;
SELECT * FROM Pedido;
SELECT * FROM Producto;
SELECT * FROM Tienda;
SELECT * FROM Departamento;
SELECT * FROM Municipio;
SELECT * FROM Repartidor;
SELECT * FROM Usuario;
SELECT * FROM Rol;
SELECT * FROM Usuario_Rol;
SELECT * FROM Categoria;