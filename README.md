# Health Check JSON to Time Series Metrics
A Nestjs application to parse `/health` check endpoints JSON response into Prometheus compatible Timeseries Metrics. The Application exposes a single **public** endpoint `GET /metrics` and exposes the below sample metrics:

```
# For service: User Service
health_check_response_status{service="User Service"} 1 1677839793181
health_check_response_time{service="User Service"} 143 1677839793181
health_check_response_code{service="User Service"} 200 1677839793181
health_check_component_status{service="User Service",component="Fusion Auth (Central)", message=""} 1 1677839793181
health_check_component_status{service="User Service",component="Fusion Auth (Samarth)", message=""} 1 1677839793181
health_check_component_status{service="User Service",component="E-Samwad", message=""} 1 1677839793181
```

### Basic metrics:
- `health_check_response_status`: tells whether the servive was UP/DOWN(0/1). If http response code is in the range >= 200, <300
- `health_check_response_time`: response time of the API (in milliseconds)
- `health_check_response_code`: http response code returned from the health check endpoint

### Advanced metrics (/health generated from [nestjs Terminus](https://docs.nestjs.com/recipes/terminus)):
- `health_check_component_status`: status of the component UP/DOWN(0/1)

The app currently supports only GET endpoints for health check.

### Setup
1. Clone the repo
2. Create `.env` & configure the variables as needed. (refer `sample.env` for format)
3. Hit `docker-compose up -d`
4. Metrics will be exposed at 'http://localhost:xxxx/metrics'

### Environment variables
- `SERVICES`: a JSON array containing objects defining a specific service; `{"name": "Some Name", "url": "some-url", "timeout": 2000}`
- `PORT`: port to expose the service on docker host
- `SERVICE_PING_DEFAULT_TIMOUT`: Default timeout for the services configured in the `SERVICES` array. If `timeout` is not defined in the object, this will be used by default.
- `MAX_EXECUTION_TIMEOUT`: Maximum time the endpoint should wait before sending response of the `/metrics` endpoint. It must be configured carefully as per the below conditions:
    - It must be **lower** than the `scrape_interval` defined in Prometheus (or any other exporter)
    - It must be **greater** than the sum of timeouts of all the services.

### TODOs

- [x] Documentation
- [x] Add support for request methods other than `GET`
- [x] Add various authentication mechanism support for individual services
- [ ] More generic & configurable for status strings
