from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY3ZWRkMDA1NzM2ODRiYzZhY2I4MzRiNmU5MWE3YzZkIiwiaCI6Im11cm11cjY0In0="


def geocode_location(location):
    url = "https://api.openrouteservice.org/geocode/search"
    params = {
        "api_key": ORS_API_KEY,
        "text": location,
        "size": 1
    }
    res = requests.get(url, params=params)
    data = res.json()
    if not data.get("features"):
        return None
    coords = data["features"][0]["geometry"]["coordinates"]
    return {"lng": coords[0], "lat": coords[1]}


def get_route(start, pickup, dropoff):
    url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json"
    }
    body = {
        "coordinates": [
            [start["lng"], start["lat"]],
            [pickup["lng"], pickup["lat"]],
            [dropoff["lng"], dropoff["lat"]]
        ]
    }
    res = requests.post(url, json=body, headers=headers)
    data = res.json()

    if "features" not in data or not data["features"]:
        raise Exception("Route could not be generated.")

    feature = data["features"][0]
    coords = feature["geometry"]["coordinates"]
    summary = feature["properties"]["summary"]

    distance_meters = summary["distance"]
    duration_seconds = summary["duration"]

    miles = round(distance_meters * 0.000621371, 2)
    hours = round(duration_seconds / 3600, 2)

    return {
        "coordinates": coords,
        "distance_miles": miles,
        "duration_hours": hours
    }


def get_coord_at_mile(coordinates, target_miles, total_miles):
    """Get exact lat/lng at a specific mile along the route"""
    target_fraction = target_miles / total_miles
    target_index = int(target_fraction * (len(coordinates) - 1))
    target_index = max(0, min(target_index, len(coordinates) - 1))
    coord = coordinates[target_index]
    return {"lat": coord[1], "lng": coord[0]}


def format_time(hour_float):
    total_minutes = int(round(hour_float * 60))
    hour = (total_minutes // 60) % 24
    minutes = total_minutes % 60
    am_pm = "AM" if hour < 12 else "PM"
    display_hour = hour % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour}:{minutes:02d} {am_pm}"


def add_event(day_events, event_type, start, end, label=None):
    event = {
        "type": event_type,
        "start": round(start, 2),
        "end": round(end, 2)
    }
    if label:
        event["label"] = label
    day_events.append(event)


def generate_trip_plan(total_miles, current_cycle_used, coordinates):
    remaining_miles = float(total_miles)
    cycle_used = float(current_cycle_used)
    miles_traveled = 0.0

    avg_speed = 60
    max_drive_per_day = 11
    break_after_hours = 8
    pickup_hours = 1
    dropoff_hours = 1
    fuel_interval_miles = 1000
    fuel_stop_hours = 0.5
    break_hours = 0.5

    day = 1
    logs = []
    stops = []
    miles_since_fuel = 0

    while remaining_miles > 0:
        day_events = []
        current_time = 8.0
        driving_today = 0.0
        driving_since_break = 0.0

        # midnight to 8 AM off duty
        add_event(day_events, "off_duty", 0, 8)

        # pickup only on first day
        if day == 1:
            pickup_coord = get_coord_at_mile(coordinates, miles_traveled, total_miles)
            add_event(day_events, "on_duty", current_time, current_time + pickup_hours, "Pickup")
            stops.append({
                "day": day,
                "type": "pickup",
                "time": format_time(current_time),
                "duration": "1 hour",
                "lat": pickup_coord["lat"],
                "lng": pickup_coord["lng"]
            })
            current_time += pickup_hours
            cycle_used += pickup_hours

        # driving loop
        while remaining_miles > 0 and driving_today < max_drive_per_day:
            drive_left_today = max_drive_per_day - driving_today
            drive_left_before_break = break_after_hours - driving_since_break
            miles_left_before_fuel = fuel_interval_miles - miles_since_fuel
            hours_left_before_fuel = miles_left_before_fuel / avg_speed
            day_end_limit = max(0.0, 22.0 - current_time)

            drive_chunk_hours = min(
                drive_left_today,
                drive_left_before_break,
                hours_left_before_fuel,
                remaining_miles / avg_speed,
                day_end_limit
            )

            if drive_chunk_hours <= 0.0:
                break

            miles_chunk = drive_chunk_hours * avg_speed

            add_event(day_events, "driving", current_time, current_time + drive_chunk_hours)
            current_time += drive_chunk_hours
            driving_today += drive_chunk_hours
            driving_since_break += drive_chunk_hours
            cycle_used += drive_chunk_hours
            remaining_miles -= miles_chunk
            miles_since_fuel += miles_chunk
            miles_traveled += miles_chunk

            # fuel stop
            if miles_since_fuel >= fuel_interval_miles and remaining_miles > 0:
                fuel_coord = get_coord_at_mile(coordinates, miles_traveled, total_miles)
                add_event(day_events, "on_duty", current_time, current_time + fuel_stop_hours, "Fuel Stop")
                stops.append({
                    "day": day,
                    "type": "fuel",
                    "time": format_time(current_time),
                    "duration": "30 mins",
                    "lat": fuel_coord["lat"],
                    "lng": fuel_coord["lng"]
                })
                current_time += fuel_stop_hours
                cycle_used += fuel_stop_hours
                miles_since_fuel = 0

            # 30 min break after 8 driving hours
            if (
                remaining_miles > 0
                and driving_today < max_drive_per_day
                and driving_since_break >= break_after_hours
            ):
                break_coord = get_coord_at_mile(coordinates, miles_traveled, total_miles)
                add_event(day_events, "off_duty", current_time, current_time + break_hours, "30 Min Break")
                stops.append({
                    "day": day,
                    "type": "break",
                    "time": format_time(current_time),
                    "duration": "30 mins",
                    "lat": break_coord["lat"],
                    "lng": break_coord["lng"]
                })
                current_time += break_hours
                driving_since_break = 0

        # dropoff
        if remaining_miles <= 0:
            dropoff_coord = get_coord_at_mile(coordinates, total_miles, total_miles)
            add_event(day_events, "on_duty", current_time, current_time + dropoff_hours, "Dropoff")
            stops.append({
                "day": day,
                "type": "dropoff",
                "time": format_time(current_time),
                "duration": "1 hour",
                "lat": dropoff_coord["lat"],
                "lng": dropoff_coord["lng"]
            })
            current_time += dropoff_hours
            cycle_used += dropoff_hours

        # rest of day off duty
        if current_time < 24:
            add_event(day_events, "off_duty", current_time, 24)

        logs.append({
            "day": day,
            "events": day_events
        })

        day += 1

    return {
        "total_days": len(logs),
        "fuel_stops": len([s for s in stops if s["type"] == "fuel"]),
        "rest_breaks": len([s for s in stops if s["type"] == "break"]),
        "cycle_used_total": round(cycle_used, 2),
        "logs": logs,
        "stops": stops
    }


@api_view(["POST"])
def plan_trip(request):
    current_location = request.data.get("current_location")
    pickup_location = request.data.get("pickup_location")
    dropoff_location = request.data.get("dropoff_location")
    current_cycle_used = request.data.get("current_cycle_used", 0)

    if not current_location or not pickup_location or not dropoff_location:
        return Response({"error": "Please provide all locations."}, status=400)

    try:
        current = geocode_location(current_location)
        pickup = geocode_location(pickup_location)
        dropoff = geocode_location(dropoff_location)

        if not current:
            return Response({"error": f"Could not find current location: {current_location}"}, status=400)
        if not pickup:
            return Response({"error": f"Could not find pickup location: {pickup_location}"}, status=400)
        if not dropoff:
            return Response({"error": f"Could not find dropoff location: {dropoff_location}"}, status=400)

        route = get_route(current, pickup, dropoff)
        trip_plan = generate_trip_plan(
            route["distance_miles"],
            current_cycle_used,
            route["coordinates"]
        )

        return Response({
            "trip_summary": {
                "total_distance_miles": route["distance_miles"],
                "estimated_drive_hours": route["duration_hours"],
                "total_days": trip_plan["total_days"],
                "fuel_stops": trip_plan["fuel_stops"],
                "rest_breaks": trip_plan["rest_breaks"],
                "cycle_used_total": trip_plan["cycle_used_total"]
            },
            "route": {
                "coordinates": route["coordinates"]
            },
            "stops": trip_plan["stops"],
            "daily_logs": trip_plan["logs"]
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)