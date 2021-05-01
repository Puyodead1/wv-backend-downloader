import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf } = format;

const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

export default createLogger({
  level: "silly",
  transports: [new transports.Console()],
  format: combine(
    timestamp({
      format: "hh:mm:ss MM-DD-YY",
    }),
    format.colorize({ level: true }),
    format.simple(),
    format.splat(),
    format.errors({ stack: true }),
    customFormat
  ),
});
