<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
  
	const API_URL = 'http://localhost:3000';
  
	let rooms = [];
	let selectedRoom = null;
	let numberOfPeople = 1;
	let message = '';
	let errorMessage = '';
	let loading = false;
	let additionalPayments = 1;
  
	const fetchRooms = async () => {
	  loading = true;
	  try {
		const response = await axios.get(`${API_URL}/rooms`);
		rooms = response.data;
		errorMessage = '';
	  } catch (error) {
		errorMessage = 'Error al cargar las habitaciones';
		console.error(error);
	  } finally {
		loading = false;
	  }
	};
  
	onMount(fetchRooms);
  
	const selectRoom = (room) => {
	  selectedRoom = room;
	  numberOfPeople = 1;
	  message = '';
	  errorMessage = '';
	};
  
	const reserveRoom = async () => {
	  if (!selectedRoom || numberOfPeople < 1 || numberOfPeople > selectedRoom.capacity * 2) {
		errorMessage = 'Por favor, seleccione un número de personas válido (no mayor al doble de la capacidad)';
		return;
	  }
  
	  loading = true;
	  try {
		await axios.post(`${API_URL}/rooms/${selectedRoom._id}/reserve`, {
		  people: numberOfPeople,
		});
		await fetchRooms();
		selectedRoom = rooms.find((r) => r._id === selectedRoom._id);
		message = 'Habitación reservada exitosamente';
		errorMessage = '';
	  } catch (error) {
		errorMessage = error.response?.data?.message || 'Error al reservar';
		console.error(error);
	  } finally {
		loading = false;
	  }
	};
  
	const payForRoom = async () => {
	  if (!selectedRoom) return;
  
	  loading = true;
	  try {
		await axios.post(`${API_URL}/rooms/${selectedRoom._id}/pay`, {
		  amount: selectedRoom.price * additionalPayments,
		});
  
		await fetchRooms();
		selectedRoom = rooms.find((r) => r._id === selectedRoom._id);
		message = 'Pago procesado exitosamente';
		errorMessage = '';
	  } catch (error) {
		errorMessage = error.response?.data?.message || 'Error al procesar el pago';
		console.error(error);
	  } finally {
		loading = false;
	  }
	};
  </script>
  
  <main class="container">
	<h1 class="title">Sistema de Reservas</h1>
  
	{#if loading}
	  <div class="loading">Cargando...</div>
	{/if}
  
	{#if errorMessage}
	  <div class="alert error">{errorMessage}</div>
	{/if}
  
	{#if message}
	  <div class="alert success">{message}</div>
	{/if}
  
	<ul class="rooms-list">
	  {#each rooms as room}
		<li 
		  class="room-row {selectedRoom?._id === room._id ? 'selected' : ''}"
		  class:unavailable={room.status === 'reserved'}
		  on:click={() => selectRoom(room)}
		>
		  <span class="room-number">Habitación {room.number}</span>
		  <span class="room-type">{room.type}</span>
		  <span class="room-description">{room.description}</span>
		  <span class="room-price">${room.price}</span>
		  <span class="room-capacity">Capacidad: {room.capacity} personas</span>
		  <span class="room-status">Estado: {room.status === 'free' ? 'Disponible' : 'Reservada'}</span>
		</li>
	  {/each}
	</ul>
  
	{#if selectedRoom}
	  <div class="reservation-panel">
		<h2>Gestionar Habitación {selectedRoom.number}</h2>
  
		{#if selectedRoom.status === 'free'}
		  <div class="reservation-form">
			<label>
			  Número de personas:
			  <input 
				type="number" 
				bind:value={numberOfPeople} 
				min="1" 
			  />
			</label>
			<button 
			  on:click={reserveRoom}
			  disabled={loading || numberOfPeople > selectedRoom.capacity * 2}
			>
			  Reservar
			</button>
		  </div>
		{:else if selectedRoom.status === 'reserved'}
		  <div class="payment-form">
			<p>Monto a pagar: ${selectedRoom.price}</p>
			<button 
			  on:click={payForRoom}
			  disabled={additionalPayments < 1}
			>
			  Procesar Pago
			</button>
		  </div>
		{/if}
	  </div>
	{/if}
  </main>
  
  <style>
	body {
	  font-family: 'Arial', sans-serif;
	  margin: 0;
	  padding: 0;
	  background-color: #e0f7fa; /* Fondo azul claro */
	  color: #333;
	}
  
	.container {
	  max-width: 1200px;
	  margin: 0 auto;
	  padding: 20px;
	}
  
	.title {
	  text-align: center;
	  margin-bottom: 30px;
	  font-size: 2.5rem;
	  color: #00796b; /* Verde azulado */
	}
  
	.loading {
	  text-align: center;
	  padding: 20px;
	  font-size: 1.5rem;
	  color: #666;
	}
  
	.alert {
	  padding: 10px;
	  border-radius: 4px;
	  margin-bottom: 20px;
	  text-align: center;
	  font-weight: bold;
	}
  
	.alert.error {
	  background-color: #fdd;
	  color: #c00;
	}
  
	.alert.success {
	  background-color: #dfd;
	  color: #090;
	}
  
	.rooms-list {
	  list-style: none;
	  padding: 0;
	  margin: 0;
	}
  
	.room-row {
	  display: grid;
	  grid-template-columns: repeat(6, 1fr);
	  gap: 10px;
	  padding: 10px;
	  border-bottom: 1px solid #ddd;
	  background-color: #fff;
	  transition: background-color 0.3s;
	  cursor: pointer;
	}
  
	.room-row:hover {
	  background-color: #b2dfdb; /* Verde azulado claro */
	}
  
	.room-row.selected {
	  background-color: #80cbc4; /* Verde más oscuro */
	}
  
	.room-row.unavailable {
	  background-color: #ffcdd2; /* Rojo claro */
	  cursor: not-allowed;
	}
  
	.room-number {
	  font-weight: bold;
	}
  
	.room-price {
	  color: #00796b;
	  font-weight: bold;
	}
  
	.reservation-panel {
	  margin-top: 30px;
	  padding: 20px;
	  border-top: 1px solid #ddd;
	  background-color: #fff;
	  border-radius: 8px;
	  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
  
	.reservation-form, .payment-form {
	  display: flex;
	  flex-direction: column;
	  gap: 15px;
	  max-width: 400px;
	  margin: 0 auto;
	}
  
	input {
	  padding: 10px;
	  border: 1px solid #ccc;
	  border-radius: 4px;
	  font-size: 1rem;
	}
  
	button {
	  padding: 12px;
	  background-color: #00796b;
	  color: white;
	  border: none;
	  border-radius: 4px;
	  font-size: 1rem;
	  cursor: pointer;
	  transition: background-color 0.3s;
	}
  
	button:hover:not(:disabled) {
	  background-color: #004d40;
	}
  
	button:disabled {
	  background-color: #ccc;
	  cursor: not-allowed;
	}
  </style>
  