# 🏋️‍♀️🎵 GymBeat

> **Your workout and your soundtrack, built together.**

GymBeat is an AI-powered gym companion that generates a workout **and** a matching soundtrack based on how you want to train, how much time you have, and the energy you are bringing to the gym.

Instead of standing in the gym wondering *"What should I do today?"* or spending time building a playlist before your session, GymBeat handles both.

Choose your workout. Choose your time. Choose your energy.

**GymBeat builds the rest.**

---

## 🚀 Live Demo

🔗 **Try GymBeat:** [[GYMBEAT LINK](https://gymbeat.onrender.com/)]

> The deployed version may take a few moments to start if the server has been inactive.

---

## 💡 The Problem

Going to the gym does not always mean knowing exactly what to do once you get there.

People may know they want to train upper body, legs, or simply get moving, but still have to decide:

- Which exercises should I do?
- How long should my workout be?
- What order should I perform the exercises in?
- What should I listen to?
- What music actually matches the intensity of my workout?

Music and training are usually treated as two completely separate decisions.

GymBeat combines them into **one experience**.

---

## ✨ How GymBeat Works

### 1. Configure your session

Choose:

- 💪 Upper Body
- 🦵 Lower Body
- 🔥 Full Body
- 🏃 Cardio
- 🧘 Recovery
- 🎲 Surprise Me

Then choose your available time and current energy level.

You can also enter an artist you want included in your soundtrack.

---

### 2. Let AI build your session

GymBeat uses your selections to generate a workout designed around your session.

Your workout is organised into phases such as:

**Warm-Up → Main Work → Cool-Down**

At the same time, GymBeat creates a soundtrack designed to complement the different stages and intensity of the workout.

---

### 3. Train with your session

Once your workout has been generated, GymBeat provides an active workout interface including:

- Exercise progression
- Exercise timers
- Previous and next controls
- Workout progress
- Upcoming exercise information
- Pause and reset controls
- Current soundtrack information

This turns the generated plan into something you can actually follow while training.

---

## 🎧 Music That Follows Your Workout

GymBeat does not treat the soundtrack as a random playlist.

Different phases of a workout have different energy requirements.

For example:

**Warm-Up**
- Lower intensity
- Gradual increase in energy

**Main Workout**
- Higher-energy tracks
- Music suited to the main training intensity

**Cool-Down**
- Lower-energy music
- Slower transition out of the session

GymBeat therefore matches music recommendations to the structure of the generated workout.

Users can open recommended tracks through supported music platforms such as Spotify and YouTube Music.

---

## 🤖 AI Integration

AI is used as part of the core GymBeat experience rather than being added as a separate chatbot feature.

GymBeat uses AI to interpret the user's training preferences and help generate a session based on factors such as:

- Workout type
- Available time
- Energy level
- Artist preference

The generated output is then transformed into the structured workout and soundtrack interface used throughout the application.

Users can also describe what they want using natural language, for example:

> "I have 45 minutes and want a hard leg session."

This provides an alternative to manually configuring each option.

---

## 🎨 Two GymBeat Themes

GymBeat includes two visual experiences:

### 💙 Blue Mode

A cool blue, cyan and purple interface designed around a futuristic training aesthetic.

### 🌸 Pink Mode

A warmer pink and purple alternative using the same GymBeat experience.

Users can switch between the two themes directly within the application.

---

## 📱 Responsive Design

GymBeat was designed to work across desktop and mobile devices.

This was particularly important because the active workout experience is intended to be usable **inside the gym**, where users are much more likely to interact with the application through their phone.

The mobile interface adapts the workout controls, timers, exercise information and soundtrack display for smaller screens.

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### AI
- Anthropic Claude API

### Deployment
- Render

### Development
- Git
- GitHub
- VS Code

---

## 📸 Screenshots

### Build Your Session
![GymBeat Session Builder](Docs/images/session-builder.png)

### Generated Workout & Soundtrack
![GymBeat Generated Session](Docs/images/generated-session.jpg)

### Active Workout
![GymBeat Active Workout](Docs/images/active-workout.png)

### Mobile Experience
![GymBeat Mobile Experience](Docs/images/mobile-workout.png) 


## 🔐 Environment Variables

GymBeat requires an Anthropic API key.

Create a `.env` file in the root directory:

```env
ANTHROPIC_API_KEY=your-api-key-here




