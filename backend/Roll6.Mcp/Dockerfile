# Roll6 MCP server (020). Build context: ./backend (docker compose: context ./backend, dockerfile Roll6.Mcp/Dockerfile).
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first so the layer is cached while only source files change. The MCP only depends on the DTOs.
COPY Roll6.DTO/Roll6.DTO.csproj Roll6.DTO/
COPY Roll6.Mcp/Roll6.Mcp.csproj Roll6.Mcp/
RUN dotnet restore Roll6.Mcp/Roll6.Mcp.csproj

COPY Roll6.DTO/ Roll6.DTO/
COPY Roll6.Mcp/ Roll6.Mcp/
RUN dotnet publish Roll6.Mcp/Roll6.Mcp.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Roll6.Mcp.dll"]
