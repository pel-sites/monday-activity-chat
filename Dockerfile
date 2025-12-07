FROM oven/bun:1

WORKDIR /app

# Copy source files
COPY . .

# Expose port
ENV PORT=8000
EXPOSE 8000

# Run server
CMD ["bun", "run", "server.ts"]
