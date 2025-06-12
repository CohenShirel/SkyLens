from datetime import datetime
from math import radians, cos, sin, asin, sqrt


def is_within_5m(lat1, lon1, lat2, lon2):
    """
    בודקת אם הנקודה (lat2, lon2) נמצאת ברדיוס של 5 מטר מהנקודה (lat1, lon1)
    מחזירה True אם כן, אחרת False
    """
    # המרחק יחושב לפי נוסחת Haversine
    R = 6371000  # רדיוס כדור הארץ במטרים
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * asin(sqrt(a))
    distance = R * c  # במטרים
    return distance <= 5


def grouping_by_location(videos_locations: list[dict]) -> list[list[dict]]:
    grouped_locations = []

    for location in videos_locations:
        found_group = False
        if not grouped_locations:
            grouped_locations.append([location])
            continue
        for group in grouped_locations:
            if is_within_5m(location['lat'], location['lon'], group[0]['lat'], group[0]['lon']):
                group.append(location)
                found_group = True
                break
        if not found_group:
            grouped_locations.append([location])

    return grouped_locations


def is_within_3_seconds(time1_str, time2_str):
    fmt = "%H:%M:%S.%f"
    t1 = datetime.strptime(time1_str, fmt)
    t2 = datetime.strptime(time2_str, fmt)
    diff = abs((t1 - t2).total_seconds())
    return diff <= 4


def grouping_by_time(dict_to_group: list[list[dict]]) -> list[list[dict]]:
    grouped_by_time = []
    for group in dict_to_group:
        current_group = [group[0]]
        first_time = group[0]['timestamp']
        for i in range(1, len(group)):
            if is_within_3_seconds(group[i]['timestamp'], first_time):
                current_group.append(group[i])
            else:
                grouped_by_time.append(current_group)
                current_group = [group[i]]
                first_time = group[i]['timestamp']
        grouped_by_time.append(current_group)
    return grouped_by_time


def calc_matrix(videos_locations: list[dict]) -> list[list[dict]]:
    grouping_locations = grouping_by_location(videos_locations)
    for element in grouping_locations:
        element.sort(key=lambda d: datetime.strptime(d['timestamp'], "%H:%M:%S.%f"))
    return grouping_by_time(grouping_locations)
