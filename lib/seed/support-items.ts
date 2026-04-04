import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const DUMMY_QUESTIONS = [
  // Envíos
  { buyer: 'Gonzo', product: 'Monitor Gamer 24"', text: '¿Hacen envíos a Tierra del Fuego?', category: 'envio' },
  { buyer: 'Maria', product: 'Auriculares Sony', text: '¿Cuánto demora el envío a Córdoba capital?', category: 'envio' },
  { buyer: 'Lucas', product: 'Silla Pro XL', text: 'El envío dice entregado pero no recibí nada.', category: 'envio' },
  { buyer: 'Ana', product: 'Teclado Mecánico', text: '¿Tienen stock para retirar hoy mismo por Palermo?', category: 'envio' },
  { buyer: 'Pedro', product: 'Mouse Logitech', text: '¿Puedo cambiar la dirección de entrega de mi pedido?', category: 'envio' },

  // Garantía
  { buyer: 'Julieta', product: 'Placa de Video RTX', text: 'Mi placa hace un ruido raro, ¿cubre la garantía?', category: 'garantia' },
  { buyer: 'Santi', product: 'Procesador i7', text: '¿Cuántos meses de garantía oficial tiene este componente?', category: 'garantia' },
  { buyer: 'Belu', product: 'Motherboard Asus', text: 'Vino con un pin doblado, quiero hacer el reclamo.', category: 'garantia' },
  { buyer: 'Fede', product: 'Fuente 750W', text: '¿La garantía es con ustedes o con el fabricante?', category: 'garantia' },

  // Precio / Pagos
  { buyer: 'Carla', product: 'Notebook Dell', text: '¿Hacen factura A?', category: 'precio' },
  { buyer: 'Martin', product: 'Cámara Canon', text: '¿En cuántas cuotas sin interés puedo pagar?', category: 'precio' },
  { buyer: 'Sol', product: 'Lente 50mm', text: '¿Hay descuento pago contado efectivo?', category: 'precio' },
  { buyer: 'Nico', product: 'Flash Yongnuo', text: 'Aceptan Mercado Pago?', category: 'precio' },

  // Técnico
  { buyer: 'Edu', product: 'Disco SSD 1TB', text: '¿Es compatible con mi Macbook Pro 2015?', category: 'tecnico' },
  { buyer: 'Gaby', product: 'Router Mesh', text: 'No puedo configurar el nodo secundario.', category: 'tecnico' },
  { buyer: 'Tomas', product: 'Memoria RAM 16GB', text: '¿Sirve para esta motherboard MSI?', category: 'tecnico' },
  { buyer: 'Vale', product: 'Cooler Master 212', text: '¿Entra en un gabinete mATX?', category: 'tecnico' },

  // General
  { buyer: 'Fran', product: 'Hub USB-C', text: '¿Tienen local a la calle?', category: 'general' },
  { buyer: 'Paula', product: 'Soporte Monitor', text: '¿Viene con los tornillos VESA?', category: 'general' },
  { buyer: 'Leo', product: 'Webcam 1080p', text: '¿Me podés mandar el link del driver?', category: 'general' },
  
  // Mas de Envíos para llegar a ~40
  { buyer: 'Romi', product: 'Joystick PS5', text: '¿Hacen envíos por Andreani?', category: 'envio' },
  { buyer: 'Matias', product: 'Combo Upgrade', text: '¿Llega antes del viernes si compro ahora?', category: 'envio' },
  { buyer: 'Sofi', product: 'Gabinete RGB', text: 'El paquete llegó golpeado.', category: 'envio' },
  { buyer: 'Damián', product: 'Micrófono Blue Snowball', text: '¿El envío es gratis superando cierto monto?', category: 'envio' },
  { buyer: 'Lorena', product: 'Ring Light 12"', text: '¿Puedo elegir el horario de entrega?', category: 'envio' },

  // Mas de Garantía
  { buyer: 'Esteban', product: 'Kit Herramientas', text: '¿Tengo que guardar la caja para la garantía?', category: 'garantia' },
  { buyer: 'Lucía', product: 'Tablet Lenovo', text: 'La pantalla tiene un pixel muerto.', category: 'garantia' },
  { buyer: 'Beto', product: 'Consola Switch', text: 'Se me rompió el analógico a la semana.', category: 'garantia' },
  
  // Mas de Técnico
  { buyer: 'Jorge', product: 'Cable HDMI 2.1', text: '¿Soporta 4K a 120Hz?', category: 'tecnico' },
  { buyer: 'Marta', product: 'Impresora Epson', text: '¿Viene con los cartuchos de tinta?', category: 'tecnico' },
  { buyer: 'Silvia', product: 'Scanner HP', text: 'No me reconoce el dispositivo en Windows 11.', category: 'tecnico' },
  { buyer: 'Raul', product: 'Micro SD 128GB', text: '¿Es Clase 10 U3?', category: 'tecnico' },

  // Mas de Precio
  { buyer: 'Oscar', product: 'Parlantes Edifier', text: 'Aumentó el precio desde ayer, ¿me respetan el anterior?', category: 'precio' },
  { buyer: 'Dani', product: 'Auriculares HyperX', text: '¿Sigue vigente la promo bancaria?', category: 'precio' },
  { buyer: 'Moni', product: 'Microprocesador AMD', text: '¿El precio publicado incluye IVA?', category: 'precio' },

  // Mas de General
  { buyer: 'Patricio', product: 'Pad gamer XXL', text: '¿Puedo comprar y que retire un tercero?', category: 'general' },
  { buyer: 'Florencia', product: 'Silla Ejecutiva', text: '¿Tienen showroom para probarla?', category: 'general' },
  { buyer: 'Seba', product: 'Ventilador 120mm', text: '¿Tienen stock de 5 unidades?', category: 'general' },
  { buyer: 'Ale', product: 'Pasta Térmica', text: '¿Viene con la espátula para aplicar?', category: 'general' },
  { buyer: 'Hugo', product: 'Mousepad Corsair', text: '¿Es lavable?', category: 'general' },
]

export async function runSeed() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Debe estar autenticado para ejecutar el seed.')
  }

  console.log(`🚀 Iniciando seed para usuario ${user.id}...`)

  const itemsWithEmbeddings = []
  for (let i = 0; i < DUMMY_QUESTIONS.length; i++) {
    const q = DUMMY_QUESTIONS[i]
    console.log(`Seeding item ${i + 1}/${DUMMY_QUESTIONS.length}...`)

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: q.text,
    })

    itemsWithEmbeddings.push({
      user_id: user.id,
      buyer_nickname: q.buyer,
      product_title: q.product,
      question_text: q.text,
      category: q.category,
      embedding: response.data[0].embedding,
      status: ['pending', 'resolved', 'escalated'][Math.floor(Math.random() * 3)],
    })
  }

  const { error } = await supabase.from('support_items').insert(itemsWithEmbeddings)

  if (error) {
    throw new Error(`Error insertando items: ${error.message}`)
  }

  return { success: true, count: itemsWithEmbeddings.length }
}
