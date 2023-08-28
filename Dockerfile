# Use the official Newman base image
FROM postman/newman:alpine

# Set a working directory in the container
WORKDIR /app

# Build argument to pass the Postman collection path
ARG POSTMAN_COLLECTION

# Copy the Postman collection to the container
COPY $POSTMAN_COLLECTION /app/collection.json

# Define the command to run the collection using Newman
CMD ["run", "collection.json"]
