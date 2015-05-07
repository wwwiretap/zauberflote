name := "evaluator"

version := "0.0.1-SNAPSHOT"

scalaVersion := "2.11.6"

scalacOptions := Seq(
  "-unchecked", "-deprecation", "-feature", "-Xfatal-warnings"
)

libraryDependencies ++= Seq(
  "org.seleniumhq.selenium" % "selenium-java" % "2.45.0"
)
