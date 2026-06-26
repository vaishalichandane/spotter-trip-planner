# Spotter Trip Planner & ELD Log Generator

A trip planning tool for truck drivers that handles route planning and daily log generation automatically.

## What it does

You enter where you are, where you need to pick up, and where you're dropping off. The app figures out the rest — how many days the trip takes, when to stop for fuel, when breaks are required by law, and fills out your daily ELD log sheets for each day.

## Built with

- Django + Django REST Framework (backend)
- React + Vite (frontend)
- Leaflet for maps
- OpenRouteService API for routing

## How to run locally

**Backend**
cd backend
pip install -r requirements.txt
python manage.py runserver

**Frontend**
cd frontend
npm install
npm run dev

## Notes

- Follows FMCSA Hours of Service rules (70hr/8day cycle)
- Fuel stop added every 1,000 miles
- 30 min break after every 8 hours of driving
- ELD logs can be downloaded as PDF
- Works with any US city

## Live App
Coming soon

## GitHub
https://github.com/vaishalichandane/spotter-trip-planner
