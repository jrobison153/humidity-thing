import json
import sys

output = {
    'temp-celcius': 45,
    'temp-farenheit': 67,
    'humidity-percentage': 54.3
}

outputAsJson = json.dumps(output)

print(outputAsJson)
sys.exit(0)
